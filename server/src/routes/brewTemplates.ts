import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { brewTemplateSchema } from '../middleware/validation.js';

const router = Router();

interface TemplateRow {
  id: number;
  name: string;
  fields: string;
}

router.get('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const templates = db.prepare(`
    SELECT id, name, fields FROM brew_templates WHERE user_id = ?
  `).all(userId) as TemplateRow[];
  
  const result = templates.map(t => ({
    id: String(t.id),
    name: t.name,
    fields: JSON.parse(t.fields)
  }));
  
  res.json(result);
});

router.post('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const result = brewTemplateSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { name, fields } = result.data;
  
  const insertResult = db.prepare(`
    INSERT INTO brew_templates (user_id, name, fields) VALUES (?, ?, ?)
  `).run(userId, name, JSON.stringify(fields));
  
  res.json({ id: String(insertResult.lastInsertRowid), name, fields });
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  
  const result = brewTemplateSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { name, fields } = result.data;
  
  db.prepare(`
    UPDATE brew_templates SET name = ?, fields = ? WHERE id = ? AND user_id = ?
  `).run(name, JSON.stringify(fields), id, userId);
  
  res.json({ success: true });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  db.prepare('DELETE FROM brew_templates WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ success: true });
});

export default router;
