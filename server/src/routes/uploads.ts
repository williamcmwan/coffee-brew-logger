import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Uploads directory - use process.cwd() which is the server directory
const uploadsDir = path.join(process.cwd(), 'data/uploads');
console.log('Uploads directory:', uploadsDir);

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage with secure random filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, _file, cb) => {
    // Use cryptographically secure random filename to prevent enumeration
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${randomName}.jpg`);
  },
});

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
];

const upload = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit (reduced from 10MB)
    files: 1, // Only allow 1 file per request
  },
  fileFilter: (_req, file, cb) => {
    // Strict MIME type checking
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else if (file.mimetype === 'application/octet-stream') {
      // For blobs, check the original filename extension
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

// Upload image - now requires authentication
router.post('/', upload.single('image'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Delete image - requires authentication
router.delete('/:filename', (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Strict filename validation - only allow hex characters and .jpg extension
    if (!/^[a-f0-9]{32}\.jpg$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }
    
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(uploadsDir, sanitizedFilename);
    
    // Verify the resolved path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
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
