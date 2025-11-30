import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db/schema.js';
import { seedUserDefaults } from '../utils/seedUserDefaults.js';
import { generateToken } from '../middleware/auth.js';
import { loginSchema, signupSchema, socialLoginSchema } from '../middleware/validation.js';

const router = Router();

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
    
    const { email, password, name } = result.data;
    
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
    res.json({ id: newUserId, email: email.toLowerCase(), name, authProvider: 'email', token });
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
      return res.json({ id: user.id, email: user.email, name: user.name, authProvider: user.auth_provider, avatarUrl: user.avatar_url, token });
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
      return res.json({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, authProvider: updatedUser.auth_provider, avatarUrl: updatedUser.avatar_url, token });
    }
    
    // Create new user
    const displayName = name || email.split('@')[0];
    const insertResult = db.prepare('INSERT INTO users (email, name, auth_provider, provider_id, avatar_url) VALUES (LOWER(?), ?, ?, ?, ?)')
      .run(email, displayName, provider, providerId, avatarUrl || null);
    
    const newUserId = Number(insertResult.lastInsertRowid);
    seedUserDefaults(newUserId);
    
    const token = generateToken(newUserId);
    res.json({ id: newUserId, email: email.toLowerCase(), name: displayName, authProvider: provider, avatarUrl, token });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ error: 'An error occurred during social login' });
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
  res.cookie('oauth_state', state, { 
    httpOnly: true, 
    secure: req.protocol === 'https',
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
