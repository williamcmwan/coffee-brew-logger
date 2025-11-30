import { Router } from 'express';
import { db } from '../db/schema.js';
import { seedUserDefaults } from '../utils/seedUserDefaults.js';

const router = Router();

interface User {
  id: number;
  email: string;
  name: string;
  auth_provider: string;
  avatar_url?: string;
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = db.prepare('SELECT id, email, name, auth_provider, avatar_url FROM users WHERE LOWER(email) = LOWER(?) AND password = ?')
    .get(email, password) as User | undefined;
  
  if (user) {
    res.json({ id: user.id, email: user.email, name: user.name, authProvider: user.auth_provider, avatarUrl: user.avatar_url });
  } else {
    const existingUser = db.prepare('SELECT id, auth_provider FROM users WHERE LOWER(email) = LOWER(?)')
      .get(email) as { id: number; auth_provider: string } | undefined;
    if (existingUser) {
      if (existingUser.auth_provider !== 'email') {
        res.status(401).json({ error: `This account uses ${existingUser.auth_provider} sign-in. Please use that method.` });
      } else {
        res.status(401).json({ error: 'Incorrect password' });
      }
    } else {
      res.status(404).json({ error: 'No account found with this email. Please sign up first.' });
    }
  }
});

router.post('/signup', (req, res) => {
  const { email, password, name } = req.body;
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
    .get(email);
  
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  
  const result = db.prepare('INSERT INTO users (email, password, name, auth_provider) VALUES (LOWER(?), ?, ?, ?)')
    .run(email, password, name, 'email');
  
  const newUserId = Number(result.lastInsertRowid);
  seedUserDefaults(newUserId);
  
  res.json({ id: newUserId, email: email.toLowerCase(), name, authProvider: 'email' });
});

// Social login endpoint - handles both Google and Apple
router.post('/social', (req, res) => {
  const { provider, providerId, email, name, avatarUrl } = req.body;
  
  if (!provider || !providerId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (provider !== 'google') {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  // Check if user exists with this provider ID
  let user = db.prepare('SELECT id, email, name, auth_provider, avatar_url FROM users WHERE auth_provider = ? AND provider_id = ?')
    .get(provider, providerId) as User | undefined;
  
  if (user) {
    // Update avatar if changed
    if (avatarUrl && avatarUrl !== user.avatar_url) {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, user.id);
      user.avatar_url = avatarUrl;
    }
    return res.json({ id: user.id, email: user.email, name: user.name, authProvider: user.auth_provider, avatarUrl: user.avatar_url });
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
    
    return res.json({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, authProvider: updatedUser.auth_provider, avatarUrl: updatedUser.avatar_url });
  }
  
  // Create new user
  const displayName = name || email.split('@')[0];
  const result = db.prepare('INSERT INTO users (email, name, auth_provider, provider_id, avatar_url) VALUES (LOWER(?), ?, ?, ?, ?)')
    .run(email, displayName, provider, providerId, avatarUrl || null);
  
  const newUserId = Number(result.lastInsertRowid);
  seedUserDefaults(newUserId);
  
  res.json({ id: newUserId, email: email.toLowerCase(), name: displayName, authProvider: provider, avatarUrl });
});

export default router;
