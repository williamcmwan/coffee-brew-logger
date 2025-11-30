import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { recipeSchema } from '../middleware/validation.js';

const router = Router();

interface RecipeRow {
  id: number;
  name: string;
  grinder_id: number | null;
  brewer_id: number | null;
  ratio: string | null;
  dose: number | null;
  photo: string | null;
  process: string | null;
  process_steps: string | null;
  grind_size: number | null;
  water: number | null;
  yield: number | null;
  temperature: number | null;
  brew_time: string | null;
  favorite: number;
}

router.get('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const recipes = db.prepare(`
    SELECT id, name, grinder_id, brewer_id, ratio, dose, photo, process, 
           process_steps, grind_size, water, yield, temperature, brew_time, favorite
    FROM recipes WHERE user_id = ?
  `).all(userId) as RecipeRow[];
  
  const result = recipes.map(r => ({
    id: String(r.id),
    name: r.name,
    grinderId: r.grinder_id ? String(r.grinder_id) : '',
    brewerId: r.brewer_id ? String(r.brewer_id) : '',
    ratio: r.ratio || '',
    dose: r.dose || 0,
    photo: r.photo,
    process: r.process || '',
    processSteps: r.process_steps ? JSON.parse(r.process_steps) : undefined,
    grindSize: r.grind_size || 0,
    water: r.water || 0,
    yield: r.yield || 0,
    temperature: r.temperature || 0,
    brewTime: r.brew_time || '',
    favorite: Boolean(r.favorite)
  }));
  
  res.json(result);
});

router.post('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const result = recipeSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { name, grinderId, brewerId, ratio, dose, photo, process, processSteps,
          grindSize, water, yield: yieldVal, temperature, brewTime, favorite } = result.data;
  
  const insertResult = db.prepare(`
    INSERT INTO recipes (user_id, name, grinder_id, brewer_id, ratio, dose, photo, process, 
                         process_steps, grind_size, water, yield, temperature, brew_time, favorite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, name, grinderId || null, brewerId || null, ratio, dose, photo || null, process,
         processSteps ? JSON.stringify(processSteps) : null, grindSize, water, yieldVal, 
         temperature, brewTime, favorite ? 1 : 0);
  
  res.json({
    id: String(insertResult.lastInsertRowid), name, grinderId, brewerId, ratio, dose, photo,
    process, processSteps, grindSize, water, yield: yieldVal, temperature, brewTime,
    favorite: Boolean(favorite)
  });
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  
  const result = recipeSchema.safeParse(req.body);
  if (!result.success) {
    console.error("Validation failed:", JSON.stringify(result.error.issues, null, 2)); console.error("Request body:", JSON.stringify(req.body, null, 2)); return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { name, grinderId, brewerId, ratio, dose, photo, process, processSteps,
          grindSize, water, yield: yieldVal, temperature, brewTime, favorite } = result.data;
  
  db.prepare(`
    UPDATE recipes SET name = ?, grinder_id = ?, brewer_id = ?, ratio = ?, dose = ?, 
           photo = ?, process = ?, process_steps = ?, grind_size = ?, water = ?, 
           yield = ?, temperature = ?, brew_time = ?, favorite = ?
    WHERE id = ? AND user_id = ?
  `).run(name, grinderId || null, brewerId || null, ratio, dose, photo || null, process,
         processSteps ? JSON.stringify(processSteps) : null, grindSize, water, yieldVal,
         temperature, brewTime, favorite ? 1 : 0, id, userId);
  
  res.json({ success: true });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  db.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ success: true });
});

router.patch('/:id/favorite', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  db.prepare(`
    UPDATE recipes SET favorite = NOT favorite WHERE id = ? AND user_id = ?
  `).run(req.params.id, userId);
  
  res.json({ success: true });
});

export default router;
