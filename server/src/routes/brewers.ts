import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { brewerSchema } from '../middleware/validation.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const brewers = db.prepare(`
    SELECT id, model, photo, type FROM brewers WHERE user_id = ?
  `).all(userId) as any[];
  
  res.json(brewers.map(b => ({ ...b, id: String(b.id) })));
});

router.post('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const result = brewerSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { model, photo, type } = result.data;
  const insertResult = db.prepare(`
    INSERT INTO brewers (user_id, model, photo, type) VALUES (?, ?, ?, ?)
  `).run(userId, model, photo || null, type);
  
  res.json({ id: String(insertResult.lastInsertRowid), model, photo, type });
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  
  const result = brewerSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { model, photo, type } = result.data;
  
  db.prepare(`
    UPDATE brewers SET model = ?, photo = ?, type = ? WHERE id = ? AND user_id = ?
  `).run(model, photo || null, type, id, userId);
  
  res.json({ id, model, photo, type });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  
  // Check if brewer is used in any recipes
  const recipeCount = db.prepare(
    'SELECT COUNT(*) as count FROM recipes WHERE brewer_id = ? AND user_id = ?'
  ).get(id, userId) as { count: number };
  
  if (recipeCount.count > 0) {
    return res.status(400).json({ 
      error: `Cannot delete this brewer. It is used in ${recipeCount.count} recipe(s). Please delete or update those recipes first.` 
    });
  }
  
  // Check if brewer is used in any brews
  const brewCount = db.prepare(
    'SELECT COUNT(*) as count FROM brews WHERE brewer_id = ? AND user_id = ?'
  ).get(id, userId) as { count: number };
  
  if (brewCount.count > 0) {
    return res.status(400).json({ 
      error: `Cannot delete this brewer. It is used in ${brewCount.count} brew(s). Please delete those brews first.` 
    });
  }
  
  db.prepare('DELETE FROM brewers WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ success: true });
});

export default router;
