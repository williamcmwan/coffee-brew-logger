import express from 'express';
import { db } from '../db/schema.js';

const router = express.Router();

// Health check endpoint for AWS Lambda / load balancer monitoring
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbCheck = db.prepare('SELECT 1 as ok').get() as { ok: number } | undefined;
    
    if (!dbCheck || dbCheck.ok !== 1) {
      throw new Error('Database check failed');
    }
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      checks: {
        database: 'ok',
        server: 'ok'
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      checks: {
        database: 'failed',
        server: 'ok'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
