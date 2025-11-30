import dotenv from 'dotenv';
import express from 'express';

// Load .env from project root
dotenv.config({ path: '../.env' });
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeDatabase } from './db/schema.js';
import authRoutes from './routes/auth.js';
import grindersRoutes from './routes/grinders.js';
import brewersRoutes from './routes/brewers.js';
import recipesRoutes from './routes/recipes.js';
import coffeeBeansRoutes from './routes/coffeeBeans.js';
import brewsRoutes from './routes/brews.js';
import brewTemplatesRoutes from './routes/brewTemplates.js';
import uploadsRoutes from './routes/uploads.js';
import coffeeServersRoutes from './routes/coffeeServers.js';
import aiRoutes from './routes/ai.js';
import { authMiddleware } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3003;

// Data directory - use process.cwd() which is the server directory
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
console.log('Uploads directory:', uploadsDir);

// Initialize database
initializeDatabase();

const app = express();

// Trust proxy - needed when behind reverse proxy (nginx, etc.) for rate limiting to work correctly
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable for SPA compatibility
  // Additional security headers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));

// CORS configuration - restrict to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
  'http://localhost:5173',
  'http://localhost:3003',
  'https://coffeebrew.dpdns.org'
];

// In development, also allow IPv6 localhost variants
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://[::1]:5173', 'http://127.0.0.1:5173');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development, log blocked origins for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('CORS blocked origin:', origin);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 attempts per window
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for password reset (prevent email bombing)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour per IP
  message: { error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reduced JSON body size limit
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Apply rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/social', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api', apiLimiter);

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/grinders', authMiddleware, grindersRoutes);
app.use('/api/brewers', authMiddleware, brewersRoutes);
app.use('/api/recipes', authMiddleware, recipesRoutes);
app.use('/api/coffee-beans', authMiddleware, coffeeBeansRoutes);
app.use('/api/brews', authMiddleware, brewsRoutes);
app.use('/api/brew-templates', authMiddleware, brewTemplatesRoutes);
app.use('/api/uploads', authMiddleware, uploadsRoutes);
app.use('/api/coffee-servers', authMiddleware, coffeeServersRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// Serve uploaded images from user-specific folders
// Path format: /uploads/{user_folder}/{filename}
app.use('/uploads', (req, res, next) => {
  // Validate path format: /{user_folder}/{safe_filename}
  // Allow alphanumeric, dots, dashes, underscores in folder and filename
  const pathMatch = req.path.match(/^\/([a-z0-9._-]+)\/([a-z0-9._-]+\.(jpg|jpeg|png|webp))$/i);
  if (!pathMatch) {
    return res.status(400).json({ error: 'Invalid path format' });
  }
  next();
}, express.static(uploadsDir));

// Serve static files from client build
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
