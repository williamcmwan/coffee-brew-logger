import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db/schema.js';
import { seedUserDefaults } from '../utils/seedUserDefaults.js';
import { generateToken } from '../middleware/auth.js';
import {
  loginSchema,
  signupSchema,
  socialLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../middleware/validation.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { isAdmin } from './admin.js';
import crypto from 'crypto';

const router = Router();

// EmailJS helper - reads env vars at runtime (after dotenv loads)
async function sendPasswordResetEmail(toEmail: string, userName: string, resetLink: string): Promise<boolean> {
  const serviceId = process.env.VITE_EMAILJS_SERVICE_ID;
  const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  const templateId = process.env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID;

  if (!serviceId || !publicKey || !templateId || !privateKey) {
    console.log('EmailJS not fully configured - skipping email send');
    return false;
  }

  try {
    const payload: Record<string, unknown> = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: toEmail,
        to_name: userName,
        reset_link: resetLink,
      },
    };

    // Add private key if available (required for server-side calls)
    if (privateKey) {
      payload.accessToken = privateKey;
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EmailJS error:', response.status, errorText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

const SALT_ROUNDS = 12;

// Helper to get Google Client ID at runtime (after dotenv has loaded)
function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
}

interface User {
  id: number;
  email: string;
  name: string;
  password: string | null;
  auth_provider: string;
  avatar_url?: string;
}

router.post('/login', async (req, res) => {
  try {
    // Validate input
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
    }
    
    const { email, password } = result.data;
    
    const user = db.prepare('SELECT id, email, name, password, auth_provider, avatar_url FROM users WHERE LOWER(email) = LOWER(?)')
      .get(email) as User | undefined;
    
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Please sign up first.' });
    }
    
    if (user.auth_provider !== 'email') {
      return res.status(401).json({ error: `This account uses ${user.auth_provider} sign-in. Please use that method.` });
    }
    
    if (!user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if password is hashed (bcrypt hashes start with $2)
    let isValidPassword = false;
    if (user.password.startsWith('$2')) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plain text password - verify and upgrade
      isValidPassword = user.password === password;
      if (isValidPassword) {
        // Upgrade to hashed password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
      }
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    const token = generateToken(user.id);
    res.json({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      authProvider: user.auth_provider, 
      avatarUrl: user.avatar_url,
      isAdmin: isAdmin(user.id),
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    // Validate input
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
    }
    
    const { email, password, name } = result.data; // confirmPassword already validated by schema
    
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
      .get(email);
    
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const insertResult = db.prepare('INSERT INTO users (email, password, name, auth_provider) VALUES (LOWER(?), ?, ?, ?)')
      .run(email, hashedPassword, name, 'email');
    
    const newUserId = Number(insertResult.lastInsertRowid);
    seedUserDefaults(newUserId);
    
    const token = generateToken(newUserId);
    res.json({ id: newUserId, email: email.toLowerCase(), name, authProvider: 'email', isAdmin: isAdmin(newUserId), token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'An error occurred during signup' });
  }
});

// Social login endpoint - verifies Google ID token server-side
router.post('/social', async (req, res) => {
  try {
    // Validate input
    const result = socialLoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
    }
    
    const { provider, idToken } = result.data;
    
    if (provider !== 'google') {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    const googleClientId = getGoogleClientId();
    if (!googleClientId) {
      console.error('GOOGLE_CLIENT_ID not set in environment. Available env vars:', Object.keys(process.env).filter(k => k.includes('GOOGLE') || k.includes('JWT')));
      return res.status(500).json({ error: 'Google authentication not configured' });
    }
    
    // Verify the Google ID token server-side
    let payload;
    try {
      // Create a new client for each request to avoid stale state
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyError: any) {
      console.error('Google token verification failed:', verifyError?.message || verifyError);
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    
    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    
    const { sub: providerId, email, name, picture: avatarUrl } = payload;

    // Check if user exists with this provider ID
    let user = db.prepare('SELECT id, email, name, auth_provider, avatar_url FROM users WHERE auth_provider = ? AND provider_id = ?')
      .get(provider, providerId) as User | undefined;
    
    if (user) {
      // Update avatar if changed
      if (avatarUrl && avatarUrl !== user.avatar_url) {
        db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, user.id);
        user.avatar_url = avatarUrl;
      }
      const token = generateToken(user.id);
      return res.json({ id: user.id, email: user.email, name: user.name, authProvider: user.auth_provider, avatarUrl: user.avatar_url, isAdmin: isAdmin(user.id), token });
    }
    
    // Check if email exists with different auth method
    const existingByEmail = db.prepare('SELECT id, auth_provider FROM users WHERE LOWER(email) = LOWER(?)')
      .get(email) as { id: number; auth_provider: string } | undefined;
    
    if (existingByEmail) {
      // Link the social account to existing user
      db.prepare('UPDATE users SET auth_provider = ?, provider_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
        .run(provider, providerId, avatarUrl, existingByEmail.id);
      
      const updatedUser = db.prepare('SELECT id, email, name, auth_provider, avatar_url FROM users WHERE id = ?')
        .get(existingByEmail.id) as User;
      
      const token = generateToken(updatedUser.id);
      return res.json({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, authProvider: updatedUser.auth_provider, avatarUrl: updatedUser.avatar_url, isAdmin: isAdmin(updatedUser.id), token });
    }
    
    // Create new user
    const displayName = name || email.split('@')[0];
    const insertResult = db.prepare('INSERT INTO users (email, name, auth_provider, provider_id, avatar_url) VALUES (LOWER(?), ?, ?, ?, ?)')
      .run(email, displayName, provider, providerId, avatarUrl || null);
    
    const newUserId = Number(insertResult.lastInsertRowid);
    seedUserDefaults(newUserId);
    
    const token = generateToken(newUserId);
    res.json({ id: newUserId, email: email.toLowerCase(), name: displayName, authProvider: provider, avatarUrl, isAdmin: isAdmin(newUserId), token });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ error: 'An error occurred during social login' });
  }
});

// Change password endpoint (requires authentication)
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
    }

    const { currentPassword, newPassword } = result.data;
    const userId = req.userId;

    const user = db.prepare('SELECT id, password, auth_provider FROM users WHERE id = ?')
      .get(userId) as User | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.auth_provider !== 'email') {
      return res.status(400).json({ error: 'Password change is not available for social login accounts' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'No password set for this account' });
    }

    // Verify current password
    let isValidPassword = false;
    if (user.password.startsWith('$2')) {
      isValidPassword = await bcrypt.compare(currentPassword, user.password);
    } else {
      isValidPassword = user.password === currentPassword;
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'An error occurred while changing password' });
  }
});

// Forgot password - request reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
    }

    const { email } = result.data;

    const user = db.prepare('SELECT id, name, auth_provider FROM users WHERE LOWER(email) = LOWER(?)')
      .get(email) as { id: number; name: string; auth_provider: string } | undefined;

    // Always return success to prevent email enumeration
    if (!user || user.auth_provider !== 'email') {
      return res.json({ message: 'If an account exists with this email, you will receive a reset link.' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Invalidate any existing tokens for this user
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

    // Store new token
    db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
      .run(user.id, token, expiresAt);

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Try to send email via EmailJS
    const emailSent = await sendPasswordResetEmail(email, user.name, resetLink);
    
    if (emailSent) {
      console.log(`Password reset email sent to ${email}`);
    } else {
      console.log(`Password reset link for ${email}: ${resetLink}`);
    }

    // Never expose reset link in response - log it server-side only for debugging
    res.json({ 
      message: 'If an account exists with this email, you will receive a reset link.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
    }

    const { token, newPassword } = result.data;

    // Find valid token
    const resetToken = db.prepare(`
      SELECT id, user_id, expires_at FROM password_reset_tokens 
      WHERE token = ? AND used = 0
    `).get(token) as { id: number; user_id: number; expires_at: string } | undefined;

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    // Check expiration
    if (new Date(resetToken.expires_at) < new Date()) {
      db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetToken.id);
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, resetToken.user_id);

    // Mark token as used
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetToken.id);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'An error occurred while resetting password' });
  }
});

// Guest login - creates or retrieves a guest user based on device ID
router.post('/guest', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 16) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    // Check if guest user already exists for this device
    let user = db.prepare('SELECT id, email, name, auth_provider FROM users WHERE auth_provider = ? AND provider_id = ?')
      .get('guest', deviceId) as User | undefined;
    
    if (user) {
      const token = generateToken(user.id);
      return res.json({ 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        authProvider: 'guest',
        isGuest: true,
        token 
      });
    }
    
    // Create new guest user
    const guestEmail = `guest_${deviceId.substring(0, 8)}@guest.local`;
    const guestName = 'Guest User';
    
    const insertResult = db.prepare('INSERT INTO users (email, name, auth_provider, provider_id) VALUES (?, ?, ?, ?)')
      .run(guestEmail, guestName, 'guest', deviceId);
    
    const newUserId = Number(insertResult.lastInsertRowid);
    seedUserDefaults(newUserId);
    
    const token = generateToken(newUserId);
    res.json({ 
      id: newUserId, 
      email: guestEmail, 
      name: guestName, 
      authProvider: 'guest',
      isGuest: true,
      token 
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'An error occurred during guest login' });
  }
});

// Migrate guest data to a real account
router.post('/migrate-guest', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { guestDeviceId } = req.body;
    const targetUserId = req.userId;
    
    if (!guestDeviceId) {
      return res.status(400).json({ error: 'Guest device ID required' });
    }
    
    // Find the guest user
    const guestUser = db.prepare('SELECT id FROM users WHERE auth_provider = ? AND provider_id = ?')
      .get('guest', guestDeviceId) as { id: number } | undefined;
    
    if (!guestUser) {
      return res.status(404).json({ error: 'Guest account not found' });
    }
    
    if (guestUser.id === targetUserId) {
      return res.status(400).json({ error: 'Cannot migrate to the same account' });
    }
    
    const guestId = guestUser.id;
    
    // Get counts of items to migrate
    const counts = {
      beans: (db.prepare('SELECT COUNT(*) as count FROM coffee_beans WHERE user_id = ?').get(guestId) as { count: number }).count,
      grinders: (db.prepare('SELECT COUNT(*) as count FROM grinders WHERE user_id = ?').get(guestId) as { count: number }).count,
      brewers: (db.prepare('SELECT COUNT(*) as count FROM brewers WHERE user_id = ?').get(guestId) as { count: number }).count,
      servers: (db.prepare('SELECT COUNT(*) as count FROM coffee_servers WHERE user_id = ?').get(guestId) as { count: number }).count,
      recipes: (db.prepare('SELECT COUNT(*) as count FROM recipes WHERE user_id = ?').get(guestId) as { count: number }).count,
      templates: (db.prepare('SELECT COUNT(*) as count FROM brew_templates WHERE user_id = ?').get(guestId) as { count: number }).count,
      brews: (db.prepare('SELECT COUNT(*) as count FROM brews WHERE user_id = ?').get(guestId) as { count: number }).count,
    };
    
    // Migrate all data from guest to target user
    db.prepare('UPDATE coffee_beans SET user_id = ? WHERE user_id = ?').run(targetUserId, guestId);
    db.prepare('UPDATE grinders SET user_id = ? WHERE user_id = ?').run(targetUserId, guestId);
    db.prepare('UPDATE brewers SET user_id = ? WHERE user_id = ?').run(targetUserId, guestId);
    db.prepare('UPDATE coffee_servers SET user_id = ? WHERE user_id = ?').run(targetUserId, guestId);
    db.prepare('UPDATE recipes SET user_id = ? WHERE user_id = ?').run(targetUserId, guestId);
    db.prepare('UPDATE brew_templates SET user_id = ? WHERE user_id = ?').run(targetUserId, guestId);
    db.prepare('UPDATE brews SET user_id = ? WHERE user_id = ?').run(targetUserId, guestId);
    
    // Delete the guest user
    db.prepare('DELETE FROM users WHERE id = ?').run(guestId);
    
    res.json({ 
      message: 'Guest data migrated successfully',
      migrated: counts
    });
  } catch (error) {
    console.error('Guest migration error:', error);
    res.status(500).json({ error: 'An error occurred during migration' });
  }
});

// Get current user info (for OAuth redirect flow)
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const user = db.prepare('SELECT id, email, name, auth_provider, avatar_url FROM users WHERE id = ?')
      .get(userId) as User | undefined;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      authProvider: user.auth_provider,
      avatarUrl: user.avatar_url,
      isAdmin: isAdmin(user.id),
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Get guest data counts for migration preview
router.get('/guest-data/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const guestUser = db.prepare('SELECT id FROM users WHERE auth_provider = ? AND provider_id = ?')
      .get('guest', deviceId) as { id: number } | undefined;
    
    if (!guestUser) {
      return res.json({ exists: false, counts: null });
    }
    
    const guestId = guestUser.id;
    const counts = {
      beans: (db.prepare('SELECT COUNT(*) as count FROM coffee_beans WHERE user_id = ?').get(guestId) as { count: number }).count,
      grinders: (db.prepare('SELECT COUNT(*) as count FROM grinders WHERE user_id = ?').get(guestId) as { count: number }).count,
      brewers: (db.prepare('SELECT COUNT(*) as count FROM brewers WHERE user_id = ?').get(guestId) as { count: number }).count,
      servers: (db.prepare('SELECT COUNT(*) as count FROM coffee_servers WHERE user_id = ?').get(guestId) as { count: number }).count,
      recipes: (db.prepare('SELECT COUNT(*) as count FROM recipes WHERE user_id = ?').get(guestId) as { count: number }).count,
      templates: (db.prepare('SELECT COUNT(*) as count FROM brew_templates WHERE user_id = ?').get(guestId) as { count: number }).count,
      brews: (db.prepare('SELECT COUNT(*) as count FROM brews WHERE user_id = ?').get(guestId) as { count: number }).count,
    };
    
    res.json({ exists: true, counts });
  } catch (error) {
    console.error('Get guest data error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// OAuth redirect flow for mobile - initiate
router.get('/google', (req, res) => {
  const googleClientId = getGoogleClientId();
  if (!googleClientId) {
    return res.status(500).json({ error: 'Google authentication not configured' });
  }
  
  // Handle protocol correctly behind reverse proxy
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
  const scope = 'openid email profile';
  const state = Math.random().toString(36).substring(7); // Simple state for CSRF protection
  
  // Store state in a cookie for verification
  // Use x-forwarded-proto for secure flag when behind reverse proxy
  const isSecure = req.get('x-forwarded-proto') === 'https' || req.protocol === 'https';
  res.cookie('oauth_state', state, { 
    httpOnly: true, 
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000 // 5 minutes
  });
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', googleClientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'online');
  authUrl.searchParams.set('prompt', 'select_account');
  
  res.redirect(authUrl.toString());
});

// OAuth redirect flow for mobile - callback
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.redirect(`/login?error=${encodeURIComponent(error as string)}`);
  }
  
  // Verify state
  const storedState = req.cookies?.oauth_state;
  if (!state || state !== storedState) {
    return res.redirect('/login?error=invalid_state');
  }
  
  // Clear the state cookie
  res.clearCookie('oauth_state');
  
  const googleClientId = getGoogleClientId();
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!googleClientId || !googleClientSecret) {
    return res.redirect('/login?error=oauth_not_configured');
  }
  
  try {
    // Handle protocol correctly behind reverse proxy
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return res.redirect('/login?error=token_exchange_failed');
    }
    
    const tokens = await tokenResponse.json();
    
    // Verify the ID token
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    
    if (!payload || !payload.sub || !payload.email) {
      return res.redirect('/login?error=invalid_token');
    }
    
    const { sub: providerId, email, name, picture: avatarUrl } = payload;
    const provider = 'google';

    // Check if user exists with this provider ID
    let user = db.prepare('SELECT id, email, name, auth_provider, avatar_url FROM users WHERE auth_provider = ? AND provider_id = ?')
      .get(provider, providerId) as User | undefined;
    
    let userId: number;
    
    if (user) {
      userId = user.id;
      // Update avatar if changed
      if (avatarUrl && avatarUrl !== user.avatar_url) {
        db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, user.id);
      }
    } else {
      // Check if email exists with different auth method
      const existingByEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
        .get(email) as { id: number } | undefined;
      
      if (existingByEmail) {
        userId = existingByEmail.id;
        // Link the social account to existing user
        db.prepare('UPDATE users SET auth_provider = ?, provider_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
          .run(provider, providerId, avatarUrl, existingByEmail.id);
      } else {
        // Create new user
        const displayName = name || email.split('@')[0];
        const insertResult = db.prepare('INSERT INTO users (email, name, auth_provider, provider_id, avatar_url) VALUES (LOWER(?), ?, ?, ?, ?)')
          .run(email, displayName, provider, providerId, avatarUrl || null);
        
        userId = Number(insertResult.lastInsertRowid);
        seedUserDefaults(userId);
      }
    }
    
    // Generate JWT token
    const token = generateToken(userId);
    
    // Redirect to frontend with token
    res.redirect(`/login?token=${token}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/login?error=authentication_failed');
  }
});

export default router;
