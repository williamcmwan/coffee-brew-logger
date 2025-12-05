import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { grinderSchema } from '../middleware/validation.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const grinders = db.prepare(`
    SELECT id, model, photo, burr_type as burrType, ideal_for as idealFor 
    FROM grinders WHERE user_id = ?
  `).all(userId) as any[];
  
  res.json(grinders.map(g => ({ ...g, id: String(g.id) })));
});

router.post('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const result = grinderSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { model, photo, burrType, idealFor } = result.data;
  const insertResult = db.prepare(`
    INSERT INTO grinders (user_id, model, photo, burr_type, ideal_for) 
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, model, photo || null, burrType, idealFor);
  
  res.json({ id: String(insertResult.lastInsertRowid), model, photo, burrType, idealFor });
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  
  const result = grinderSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { model, photo, burrType, idealFor } = result.data;
  
  db.prepare(`
    UPDATE grinders SET model = ?, photo = ?, burr_type = ?, ideal_for = ?
    WHERE id = ? AND user_id = ?
  `).run(model, photo || null, burrType, idealFor, id, userId);
  
  res.json({ id, model, photo, burrType, idealFor });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  
  // Check if grinder is used in any recipes
  const recipeCount = db.prepare(
    'SELECT COUNT(*) as count FROM recipes WHERE grinder_id = ? AND user_id = ?'
  ).get(id, userId) as { count: number };
  
  if (recipeCount.count > 0) {
    return res.status(400).json({ 
      error: `Cannot delete this grinder. It is used in ${recipeCount.count} recipe(s). Please delete or update those recipes first.` 
    });
  }
  
  // Check if grinder is used in any brews
  const brewCount = db.prepare(
    'SELECT COUNT(*) as count FROM brews WHERE grinder_id = ? AND user_id = ?'
  ).get(id, userId) as { count: number };
  
  if (brewCount.count > 0) {
    return res.status(400).json({ 
      error: `Cannot delete this grinder. It is used in ${brewCount.count} brew(s). Please delete those brews first.` 
    });
  }
  
  db.prepare('DELETE FROM grinders WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ success: true });
});

export default router;
