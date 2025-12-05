import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get admin emails from environment (comma-separated list)
function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS || 'admin@admin.com';
  return adminEmails.split(',').map(email => email.trim().toLowerCase());
}

// Get template user email from environment
function getTemplateUserEmail(): string {
  return process.env.TEMPLATE_USER_EMAIL || 'admin@admin.com';
}

// Get template user ID (for copying equipment/recipes)
function getTemplateUserId(): number | null {
  const templateEmail = getTemplateUserEmail();
  const templateUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(templateEmail) as { id: number } | undefined;
  return templateUser?.id || null;
}

// Check if current user is admin
function isAdmin(userId: number): boolean {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;
  if (!user) return false;
  const adminEmails = getAdminEmails();
  const result = adminEmails.includes(user.email.toLowerCase());
  console.log(`isAdmin check: userId=${userId}, email=${user.email}, adminEmails=${JSON.stringify(adminEmails)}, result=${result}`);
  return result;
}

// Export for use in auth routes
export { isAdmin };

// Admin middleware
function adminOnly(req: AuthRequest, res: Response, next: () => void) {
  if (!req.userId || !isAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Get daily stats (user registrations + token usage)
router.get('/stats/daily', adminOnly, (req: AuthRequest, res: Response) => {
  try {
    // Get user registrations by date
    const userStats = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as userCount
      FROM users
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all() as { date: string; userCount: number }[];
  
    // Get token usage by date from api_usage table
    const tokenStats = db.prepare(`
      SELECT DATE(created_at) as date, 
             SUM(input_tokens) as inputTokens, 
             SUM(output_tokens) as outputTokens
      FROM api_usage
      GROUP BY DATE(created_at)
    `).all() as { date: string; inputTokens: number; outputTokens: number }[];
  
    // Merge data
    const allDates = new Set([
      ...userStats.map(s => s.date),
      ...tokenStats.map(t => t.date)
    ]);
  
    const result = Array.from(allDates).map(date => ({
      date,
      userCount: userStats.find(s => s.date === date)?.userCount || 0,
      inputTokens: tokenStats.find(t => t.date === date)?.inputTokens || 0,
      outputTokens: tokenStats.find(t => t.date === date)?.outputTokens || 0,
    })).sort((a, b) => b.date.localeCompare(a.date));
  
    // Calculate totals
    const totals = {
      totalUsers: userStats.reduce((sum, s) => sum + s.userCount, 0),
      totalInputTokens: tokenStats.reduce((sum, t) => sum + t.inputTokens, 0),
      totalOutputTokens: tokenStats.reduce((sum, t) => sum + t.outputTokens, 0),
    };
  
    res.json({ daily: result, totals });
  } catch (error) {
    console.error('Error in /stats/daily:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Get users registered on a specific date with their record counts
router.get('/stats/users/:date', adminOnly, (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.params;
    
    const users = db.prepare(`
      SELECT 
        u.id,
        u.email,
        u.created_at as registeredAt,
        (SELECT COUNT(*) FROM coffee_beans WHERE user_id = u.id AND source = 'ai') as beansAI,
        (SELECT COUNT(*) FROM coffee_beans WHERE user_id = u.id AND (source = 'manual' OR source IS NULL)) as beansManual,
        (SELECT COUNT(*) FROM grinders WHERE user_id = u.id) as grinders,
        (SELECT COUNT(*) FROM brewers WHERE user_id = u.id) as brewers,
        (SELECT COUNT(*) FROM coffee_servers WHERE user_id = u.id) as servers,
        (SELECT COUNT(*) FROM recipes WHERE user_id = u.id) as recipes,
        (SELECT COUNT(*) FROM brew_templates WHERE user_id = u.id) as brewTemplates,
        (SELECT COUNT(*) FROM brews WHERE user_id = u.id) as brewHistory
      FROM users u
      WHERE DATE(u.created_at) = ?
      ORDER BY u.created_at DESC
    `).all(date) as any[];
    
    res.json(users);
  } catch (error) {
    console.error('Error in /stats/users/:date:', error);
    res.status(500).json({ error: 'Failed to load user details' });
  }
});

// Get template user's grinders (for "Copy from templates" feature)
router.get('/grinders', (req: AuthRequest, res: Response) => {
  const templateUserId = getTemplateUserId();
  if (!templateUserId) {
    return res.json([]);
  }
  
  const grinders = db.prepare(`
    SELECT id, model, photo, burr_type as burrType, ideal_for as idealFor 
    FROM grinders WHERE user_id = ?
  `).all(templateUserId) as any[];
  
  res.json(grinders.map(g => ({ ...g, id: String(g.id) })));
});

// Get template user's brewers
router.get('/brewers', (req: AuthRequest, res: Response) => {
  const templateUserId = getTemplateUserId();
  if (!templateUserId) {
    return res.json([]);
  }
  
  const brewers = db.prepare(`
    SELECT id, model, photo, type 
    FROM brewers WHERE user_id = ?
  `).all(templateUserId) as any[];
  
  res.json(brewers.map(b => ({ ...b, id: String(b.id) })));
});

// Get template user's coffee servers
router.get('/coffee-servers', (req: AuthRequest, res: Response) => {
  const templateUserId = getTemplateUserId();
  if (!templateUserId) {
    return res.json([]);
  }
  
  const servers = db.prepare(`
    SELECT id, model, photo, max_volume as maxVolume, empty_weight as emptyWeight 
    FROM coffee_servers WHERE user_id = ?
  `).all(templateUserId) as any[];
  
  res.json(servers.map(s => ({ ...s, id: String(s.id) })));
});

// Get template user's recipes (without grinder/brewer IDs since those are user-specific)
router.get('/recipes', (req: AuthRequest, res: Response) => {
  const templateUserId = getTemplateUserId();
  if (!templateUserId) {
    return res.json([]);
  }
  
  const recipes = db.prepare(`
    SELECT r.id, r.name, r.ratio, r.dose, r.photo, r.process, r.process_steps as processSteps,
           r.grind_size as grindSize, r.water, r.yield, r.temperature, r.brew_time as brewTime,
           g.model as grinderModel, b.model as brewerModel
    FROM recipes r
    LEFT JOIN grinders g ON r.grinder_id = g.id
    LEFT JOIN brewers b ON r.brewer_id = b.id
    WHERE r.user_id = ?
  `).all(templateUserId) as any[];
  
  res.json(recipes.map(r => ({
    ...r,
    id: String(r.id),
    processSteps: r.processSteps ? JSON.parse(r.processSteps) : [],
  })));
});

// Get template user's brew templates
router.get('/brew-templates', (req: AuthRequest, res: Response) => {
  const templateUserId = getTemplateUserId();
  if (!templateUserId) {
    return res.json([]);
  }
  
  const templates = db.prepare(`
    SELECT id, name, fields FROM brew_templates WHERE user_id = ?
  `).all(templateUserId) as any[];
  
  res.json(templates.map(t => ({
    id: String(t.id),
    name: t.name,
    fields: JSON.parse(t.fields),
  })));
});

// Check if current user is admin
router.get('/check', (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.json({ isAdmin: false });
  }
  res.json({ isAdmin: isAdmin(req.userId) });
});

export default router;
