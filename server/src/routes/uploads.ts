import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/schema.js';

const router = express.Router();

// Base uploads directory
const uploadsBaseDir = path.join(process.cwd(), 'data/uploads');

// Ensure base uploads directory exists
if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

// Sanitize email to create safe folder name
function sanitizeEmail(email: string): string {
  // Replace @ with _at_ and remove/replace unsafe characters
  return email
    .toLowerCase()
    .replace('@', '_at_')
    .replace(/[^a-z0-9._-]/g, '_');
}

// Get user's email from database
function getUserEmail(userId: number): string | null {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;
  return user?.email || null;
}

// Get or create user's upload directory
function getUserUploadsDir(userId: number): string | null {
  const email = getUserEmail(userId);
  if (!email) return null;
  
  const userFolder = sanitizeEmail(email);
  const userDir = path.join(uploadsBaseDir, userFolder);
  
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  
  return userDir;
}

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// Configure multer with custom storage
const storage = multer.diskStorage({
  destination: (req: AuthRequest, _file, cb) => {
    const userId = req.userId;
    if (!userId) {
      return cb(new Error('User not authenticated'), '');
    }
    
    const userDir = getUserUploadsDir(userId);
    if (!userDir) {
      return cb(new Error('Could not determine user directory'), '');
    }
    
    cb(null, userDir);
  },
  filename: (_req, _file, cb) => {
    // Use cryptographically secure random filename
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${randomName}.jpg`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else if (file.mimetype === 'application/octet-stream') {
      const ext = path.extname(file.originalname).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    } else {
      cb(new Error('Invalid file type: ' + file.mimetype));
    }
  },
});

// Upload image - requires authentication
router.post('/', upload.single('image'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const userId = req.userId!;
    const email = getUserEmail(userId);
    if (!email) {
      return res.status(400).json({ error: 'User not found' });
    }

    const userFolder = sanitizeEmail(email);
    const url = `/uploads/${userFolder}/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Delete image - requires authentication, only own files
router.delete('/:filename', (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const userId = req.userId!;

    // Strict filename validation
    if (!/^[a-f0-9]{32}\.jpg$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }

    const email = getUserEmail(userId);
    if (!email) {
      return res.status(400).json({ error: 'User not found' });
    }

    const userFolder = sanitizeEmail(email);
    const userDir = path.join(uploadsBaseDir, userFolder);
    const filePath = path.join(userDir, path.basename(filename));

    // Verify path is within user's directory (prevent traversal)
    const resolvedPath = path.resolve(filePath);
    const resolvedUserDir = path.resolve(userDir);
    if (!resolvedPath.startsWith(resolvedUserDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
