import express from 'express';
import cors from 'cors';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3003;

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
initializeDatabase();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/grinders', grindersRoutes);
app.use('/api/brewers', brewersRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/coffee-beans', coffeeBeansRoutes);
app.use('/api/brews', brewsRoutes);
app.use('/api/brew-templates', brewTemplatesRoutes);
app.use('/api/uploads', uploadsRoutes);

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

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
