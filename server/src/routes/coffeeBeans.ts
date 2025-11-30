import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { coffeeBeanSchema } from '../middleware/validation.js';

const router = Router();

interface CoffeeBeanRow {
  id: number;
  photo: string | null;
  name: string;
  roaster: string | null;
  country: string | null;
  region: string | null;
  altitude: string | null;
  varietal: string | null;
  process: string | null;
  roast_level: string | null;
  roast_for: string | null;
  tasting_notes: string | null;
  url: string | null;
  favorite: number;
  low_stock_threshold: number | null;
}

interface BatchRow {
  id: number;
  coffee_bean_id: number;
  price: number | null;
  roast_date: string | null;
  weight: number | null;
  current_weight: number | null;
  purchase_date: string | null;
  notes: string | null;
  is_active: number;
}

router.get('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const beans = db.prepare(`
    SELECT id, photo, name, roaster, country, region, altitude, varietal, 
           process, roast_level, roast_for, tasting_notes, url, favorite, low_stock_threshold
    FROM coffee_beans WHERE user_id = ?
  `).all(userId) as CoffeeBeanRow[];
  
  const batches = db.prepare(`
    SELECT cb.id, cb.coffee_bean_id, cb.price, cb.roast_date, cb.weight, 
           cb.current_weight, cb.purchase_date, cb.notes, cb.is_active
    FROM coffee_batches cb
    JOIN coffee_beans b ON cb.coffee_bean_id = b.id
    WHERE b.user_id = ?
  `).all(userId) as BatchRow[];
  
  const result = beans.map(bean => ({
    id: String(bean.id),
    photo: bean.photo,
    name: bean.name,
    roaster: bean.roaster || '',
    country: bean.country || '',
    region: bean.region || '',
    altitude: bean.altitude || '',
    varietal: bean.varietal || '',
    process: bean.process || '',
    roastLevel: bean.roast_level || '',
    roastFor: bean.roast_for || '',
    tastingNotes: bean.tasting_notes || '',
    url: bean.url,
    favorite: Boolean(bean.favorite),
    lowStockThreshold: bean.low_stock_threshold,
    batches: batches
      .filter(b => b.coffee_bean_id === bean.id)
      .map(b => ({
        id: String(b.id),
        price: b.price || 0,
        roastDate: b.roast_date || '',
        weight: b.weight || 0,
        currentWeight: b.current_weight || 0,
        purchaseDate: b.purchase_date || '',
        notes: b.notes,
        isActive: Boolean(b.is_active)
      }))
  }));
  
  res.json(result);
});

router.post('/', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  const result = coffeeBeanSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0]?.message || "Invalid input" });
  }
  
  const { photo, name, roaster, country, region, altitude, varietal, process, 
          roastLevel, roastFor, tastingNotes, url, favorite, lowStockThreshold, batches } = result.data;
  
  const insertResult = db.prepare(`
    INSERT INTO coffee_beans (user_id, photo, name, roaster, country, region, altitude, 
                              varietal, process, roast_level, roast_for, tasting_notes, url, favorite, low_stock_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, photo || null, name, roaster, country, region, altitude, varietal, 
         process, roastLevel, roastFor, tastingNotes, url || null, favorite ? 1 : 0, lowStockThreshold);
  
  const beanId = insertResult.lastInsertRowid;
  const insertedBatches: any[] = [];
  
  if (batches && batches.length > 0) {
    const insertBatch = db.prepare(`
      INSERT INTO coffee_batches (coffee_bean_id, price, roast_date, weight, current_weight, 
                                  purchase_date, notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const batch of batches) {
      const batchResult = insertBatch.run(beanId, batch.price, batch.roastDate, batch.weight, 
                                          batch.currentWeight, batch.purchaseDate, batch.notes, 
                                          batch.isActive ? 1 : 0);
      insertedBatches.push({ ...batch, id: String(batchResult.lastInsertRowid) });
    }
  }
  
  res.json({
    id: String(beanId), photo, name, roaster, country, region, altitude, varietal,
    process, roastLevel, roastFor, tastingNotes, url, favorite: Boolean(favorite),
    lowStockThreshold, batches: insertedBatches
  });
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;
  
  // Allow partial updates - don't validate, just extract fields
  const { photo, name, roaster, country, region, altitude, varietal, process, 
          roastLevel, roastFor, tastingNotes, url, favorite, lowStockThreshold, batches } = req.body;
  
  // Only update bean fields if name is provided (full update)
  if (name !== undefined) {
    db.prepare(`
      UPDATE coffee_beans SET photo = ?, name = ?, roaster = ?, country = ?, region = ?, 
             altitude = ?, varietal = ?, process = ?, roast_level = ?, roast_for = ?, tasting_notes = ?, 
             url = ?, favorite = ?, low_stock_threshold = ?
      WHERE id = ? AND user_id = ?
    `).run(photo || null, name, roaster, country, region, altitude, varietal, process, 
           roastLevel, roastFor, tastingNotes, url || null, favorite ? 1 : 0, lowStockThreshold, id, userId);
  }
  
  // Handle batches update - update existing batches in place to preserve IDs
  if (batches) {
    const checkBatchExists = db.prepare(`SELECT id FROM coffee_batches WHERE id = ? AND coffee_bean_id = ?`);
    
    const updateBatch = db.prepare(`
      UPDATE coffee_batches SET price = ?, roast_date = ?, weight = ?, current_weight = ?, 
                                purchase_date = ?, notes = ?, is_active = ?
      WHERE id = ? AND coffee_bean_id = ?
    `);
    
    const insertBatch = db.prepare(`
      INSERT INTO coffee_batches (coffee_bean_id, price, roast_date, weight, current_weight, 
                                  purchase_date, notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const batch of batches) {
      // Check if batch actually exists in database (client may send temp IDs for new batches)
      const existingBatch = batch.id ? checkBatchExists.get(batch.id, id) : null;
      
      if (existingBatch) {
        // Update existing batch
        updateBatch.run(batch.price, batch.roastDate, batch.weight, 
                        batch.currentWeight, batch.purchaseDate, batch.notes, 
                        batch.isActive ? 1 : 0, batch.id, id);
      } else {
        // Insert new batch
        insertBatch.run(id, batch.price, batch.roastDate, batch.weight, 
                        batch.currentWeight, batch.purchaseDate, batch.notes, 
                        batch.isActive ? 1 : 0);
      }
    }
  }
  
  res.json({ success: true });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  db.prepare('DELETE FROM coffee_beans WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ success: true });
});

router.patch('/:id/favorite', (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  db.prepare(`
    UPDATE coffee_beans SET favorite = NOT favorite WHERE id = ? AND user_id = ?
  `).run(req.params.id, userId);
  
  res.json({ success: true });
});

export default router;
