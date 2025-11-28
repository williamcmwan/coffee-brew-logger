import { Router } from 'express';
import { db } from '../db/schema.js';

const router = Router();

interface BrewRow {
  id: number;
  date: string;
  coffee_bean_id: number | null;
  batch_id: number | null;
  grinder_id: number | null;
  brewer_id: number | null;
  recipe_id: number | null;
  coffee_server_id: number | null;
  dose: number | null;
  grind_size: number | null;
  water: number | null;
  yield: number | null;
  temperature: number | null;
  brew_time: string | null;
  tds: number | null;
  extraction_yield: number | null;
  rating: number | null;
  comment: string | null;
  photo: string | null;
  favorite: number;
  template_notes: string | null;
}

router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const brews = db.prepare(`
    SELECT id, date, coffee_bean_id, batch_id, grinder_id, brewer_id, recipe_id,
           coffee_server_id, dose, grind_size, water, yield, temperature, brew_time, tds, 
           extraction_yield, rating, comment, photo, favorite, template_notes
    FROM brews WHERE user_id = ? ORDER BY date DESC
  `).all(userId) as BrewRow[];
  
  const result = brews.map(b => ({
    id: String(b.id),
    date: b.date,
    coffeeBeanId: b.coffee_bean_id ? String(b.coffee_bean_id) : '',
    batchId: b.batch_id ? String(b.batch_id) : '',
    grinderId: b.grinder_id ? String(b.grinder_id) : '',
    brewerId: b.brewer_id ? String(b.brewer_id) : '',
    recipeId: b.recipe_id ? String(b.recipe_id) : '',
    coffeeServerId: b.coffee_server_id ? String(b.coffee_server_id) : '',
    dose: b.dose || 0,
    grindSize: b.grind_size || 0,
    water: b.water || 0,
    yield: b.yield || 0,
    temperature: b.temperature || 0,
    brewTime: b.brew_time || '',
    tds: b.tds,
    extractionYield: b.extraction_yield,
    rating: b.rating,
    comment: b.comment,
    photo: b.photo,
    favorite: Boolean(b.favorite),
    templateNotes: b.template_notes ? JSON.parse(b.template_notes) : undefined
  }));
  
  res.json(result);
});

router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { coffeeBeanId, batchId, grinderId, brewerId, recipeId, coffeeServerId, dose, grindSize,
          water, yield: yieldVal, temperature, brewTime, tds, extractionYield,
          rating, comment, photo, favorite, templateNotes } = req.body;
  
  const date = new Date().toISOString();
  
  // Convert empty strings to null for foreign key fields
  const toNullableId = (id: any) => (id && id !== '' && id !== 'none') ? id : null;
  
  const result = db.prepare(`
    INSERT INTO brews (user_id, date, coffee_bean_id, batch_id, grinder_id, brewer_id, 
                       recipe_id, coffee_server_id, dose, grind_size, water, yield, temperature, brew_time, 
                       tds, extraction_yield, rating, comment, photo, favorite, template_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, date, toNullableId(coffeeBeanId), toNullableId(batchId), toNullableId(grinderId), 
         toNullableId(brewerId), toNullableId(recipeId), toNullableId(coffeeServerId), dose, grindSize, water, yieldVal, temperature,
         brewTime, tds, extractionYield, rating, comment, photo, favorite ? 1 : 0,
         templateNotes ? JSON.stringify(templateNotes) : null);
  
  res.json({
    id: String(result.lastInsertRowid), date, coffeeBeanId, batchId, grinderId, brewerId,
    recipeId, coffeeServerId, dose, grindSize, water, yield: yieldVal, temperature, brewTime, tds,
    extractionYield, rating, comment, photo, favorite: Boolean(favorite), templateNotes
  });
});

router.put('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  const { coffeeBeanId, batchId, grinderId, brewerId, recipeId, coffeeServerId, dose, grindSize,
          water, yield: yieldVal, temperature, brewTime, tds, extractionYield,
          rating, comment, photo, favorite, templateNotes } = req.body;
  
  // Convert empty strings to null for foreign key fields
  const toNullableId = (id: any) => (id && id !== '' && id !== 'none') ? id : null;
  
  db.prepare(`
    UPDATE brews SET coffee_bean_id = ?, batch_id = ?, grinder_id = ?, brewer_id = ?, 
           recipe_id = ?, coffee_server_id = ?, dose = ?, grind_size = ?, water = ?, yield = ?, temperature = ?, 
           brew_time = ?, tds = ?, extraction_yield = ?, rating = ?, comment = ?, 
           photo = ?, favorite = ?, template_notes = ?
    WHERE id = ? AND user_id = ?
  `).run(toNullableId(coffeeBeanId), toNullableId(batchId), toNullableId(grinderId), toNullableId(brewerId),
         toNullableId(recipeId), toNullableId(coffeeServerId), dose, grindSize, water, yieldVal, temperature, brewTime,
         tds, extractionYield, rating, comment, photo, favorite ? 1 : 0,
         templateNotes ? JSON.stringify(templateNotes) : null, id, userId);
  
  res.json({ success: true });
});

router.patch('/:id/favorite', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  db.prepare(`
    UPDATE brews SET favorite = NOT favorite WHERE id = ? AND user_id = ?
  `).run(req.params.id, userId);
  
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  db.prepare('DELETE FROM brews WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ success: true });
});

export default router;
