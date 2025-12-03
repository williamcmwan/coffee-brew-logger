import { db } from '../db/schema.js';

const TEMPLATE_USER_EMAIL = 'admin@admin.com';

export function seedUserDefaults(newUserId: number): void {
  // Check if seeding is enabled via environment variable
  const seedEnabled = process.env.SEED_USER_DEFAULTS !== 'false';
  if (!seedEnabled) {
    console.log('User default seeding is disabled (SEED_USER_DEFAULTS=false)');
    return;
  }

  // Get template user
  const templateUser = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
    .get(TEMPLATE_USER_EMAIL) as { id: number } | undefined;

  if (!templateUser) {
    console.log('Template user not found, skipping default seeding');
    return;
  }

  const templateUserId = templateUser.id;

  // Don't seed if the new user IS the template user
  if (newUserId === templateUserId) {
    return;
  }

  // ID mappings: old template ID -> new user ID
  const grinderIdMap = new Map<number, number>();
  const brewerIdMap = new Map<number, number>();

  // Copy grinders and build ID mapping
  const grinders = db
    .prepare('SELECT id, model, photo, burr_type, ideal_for FROM grinders WHERE user_id = ?')
    .all(templateUserId) as any[];

  for (const g of grinders) {
    const result = db
      .prepare('INSERT INTO grinders (user_id, model, photo, burr_type, ideal_for) VALUES (?, ?, ?, ?, ?)')
      .run(newUserId, g.model, g.photo, g.burr_type, g.ideal_for);
    grinderIdMap.set(g.id, Number(result.lastInsertRowid));
  }

  // Copy brewers and build ID mapping
  const brewers = db
    .prepare('SELECT id, model, photo, type FROM brewers WHERE user_id = ?')
    .all(templateUserId) as any[];

  for (const b of brewers) {
    const result = db
      .prepare('INSERT INTO brewers (user_id, model, photo, type) VALUES (?, ?, ?, ?)')
      .run(newUserId, b.model, b.photo, b.type);
    brewerIdMap.set(b.id, Number(result.lastInsertRowid));
  }

  // Copy coffee servers
  const servers = db
    .prepare('SELECT model, photo, max_volume, empty_weight FROM coffee_servers WHERE user_id = ?')
    .all(templateUserId) as any[];

  for (const s of servers) {
    db.prepare('INSERT INTO coffee_servers (user_id, model, photo, max_volume, empty_weight) VALUES (?, ?, ?, ?, ?)')
      .run(newUserId, s.model, s.photo, s.max_volume, s.empty_weight);
  }

  // Copy brew templates
  const templates = db
    .prepare('SELECT name, fields FROM brew_templates WHERE user_id = ?')
    .all(templateUserId) as any[];

  for (const t of templates) {
    db.prepare('INSERT INTO brew_templates (user_id, name, fields) VALUES (?, ?, ?)')
      .run(newUserId, t.name, t.fields);
  }

  // Copy recipes with mapped grinder/brewer IDs
  const recipes = db
    .prepare(`
      SELECT name, grinder_id, brewer_id, ratio, dose, photo, process, process_steps, 
             grind_size, water, yield, temperature, brew_time, favorite 
      FROM recipes WHERE user_id = ?
    `)
    .all(templateUserId) as any[];

  for (const r of recipes) {
    // Map the grinder and brewer IDs to the new user's equipment
    const newGrinderId = r.grinder_id ? grinderIdMap.get(r.grinder_id) || null : null;
    const newBrewerId = r.brewer_id ? brewerIdMap.get(r.brewer_id) || null : null;

    db.prepare(`
      INSERT INTO recipes (user_id, name, grinder_id, brewer_id, ratio, dose, photo, process, 
                          process_steps, grind_size, water, yield, temperature, brew_time, favorite) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newUserId,
      r.name,
      newGrinderId,
      newBrewerId,
      r.ratio,
      r.dose,
      r.photo,
      r.process,
      r.process_steps,
      r.grind_size,
      r.water,
      r.yield,
      r.temperature,
      r.brew_time,
      r.favorite
    );
  }

  console.log(`Seeded defaults for user ${newUserId} from template user`);
}
