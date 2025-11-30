import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { coffeeServerSchema } from '../middleware/validation.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const servers = db.prepare(`
    SELECT id, model, photo, max_volume, empty_weight FROM coffee_servers WHERE user_id = ?
  `).all(userId) as any[];
  
  res.json(servers.map(s => ({
    id: String(s.id),
    model: s.model,
    photo: s.photo,
    maxVolume: s.max_volume,
    emptyWeight: s.empty_weight,
  })));
});

router.post('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const result = coffeeServerSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { model, photo, maxVolume, emptyWeight } = result.data;
  const insertResult = db.prepare(`
    INSERT INTO coffee_servers (user_id, model, photo, max_volume, empty_weight) VALUES (?, ?, ?, ?, ?)
  `).run(userId, model, photo || null, maxVolume, emptyWeight);
  
  res.json({ id: String(insertResult.lastInsertRowid), model, photo, maxVolume, emptyWeight });
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  
  const result = coffeeServerSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { model, photo, maxVolume, emptyWeight } = result.data;
  
  db.prepare(`
    UPDATE coffee_servers SET model = ?, photo = ?, max_volume = ?, empty_weight = ? WHERE id = ? AND user_id = ?
  `).run(model, photo || null, maxVolume, emptyWeight, id, userId);
  
  res.json({ id, model, photo, maxVolume, emptyWeight });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  db.prepare('DELETE FROM coffee_servers WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ success: true });
});

export default router;
