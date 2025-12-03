/**
 * Delete User Script
 * Removes a user and all their associated data from the database
 *
 * Usage:
 *   npx tsx scripts/delete-user.ts <email>
 *   npx tsx scripts/delete-user.ts <email> --dry-run
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'brew-journal.db');
const UPLOADS_PATH = path.join(__dirname, '..', 'data', 'uploads');

const email = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!email) {
  console.error('Usage: npx tsx scripts/delete-user.ts <email> [--dry-run]');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH);

// Find user
const user = db.prepare('SELECT id, email, name, auth_provider FROM users WHERE LOWER(email) = LOWER(?)').get(email) as {
  id: number;
  email: string;
  name: string;
  auth_provider: string;
} | undefined;

if (!user) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}

console.log('');
console.log('========================================');
console.log('  Delete User Script');
console.log('========================================');
console.log('');
console.log(`User: ${user.name} (${user.email})`);
console.log(`ID: ${user.id}`);
console.log(`Auth Provider: ${user.auth_provider}`);
console.log('');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made');
  console.log('');
}

// Count records in each table
const counts = {
  grinders: (db.prepare('SELECT COUNT(*) as count FROM grinders WHERE user_id = ?').get(user.id) as { count: number }).count,
  brewers: (db.prepare('SELECT COUNT(*) as count FROM brewers WHERE user_id = ?').get(user.id) as { count: number }).count,
  coffee_beans: (db.prepare('SELECT COUNT(*) as count FROM coffee_beans WHERE user_id = ?').get(user.id) as { count: number }).count,
  coffee_servers: (db.prepare('SELECT COUNT(*) as count FROM coffee_servers WHERE user_id = ?').get(user.id) as { count: number }).count,
  recipes: (db.prepare('SELECT COUNT(*) as count FROM recipes WHERE user_id = ?').get(user.id) as { count: number }).count,
  brews: (db.prepare('SELECT COUNT(*) as count FROM brews WHERE user_id = ?').get(user.id) as { count: number }).count,
  brew_templates: (db.prepare('SELECT COUNT(*) as count FROM brew_templates WHERE user_id = ?').get(user.id) as { count: number }).count,
  password_reset_tokens: (db.prepare('SELECT COUNT(*) as count FROM password_reset_tokens WHERE user_id = ?').get(user.id) as { count: number }).count,
};

// Count coffee batches (linked through coffee_beans)
const beanIds = db.prepare('SELECT id FROM coffee_beans WHERE user_id = ?').all(user.id) as { id: number }[];
let batchCount = 0;
if (beanIds.length > 0) {
  const placeholders = beanIds.map(() => '?').join(',');
  batchCount = (db.prepare(`SELECT COUNT(*) as count FROM coffee_batches WHERE coffee_bean_id IN (${placeholders})`).get(...beanIds.map(b => b.id)) as { count: number }).count;
}

console.log('Records to delete:');
console.log(`  - Grinders: ${counts.grinders}`);
console.log(`  - Brewers: ${counts.brewers}`);
console.log(`  - Coffee Beans: ${counts.coffee_beans}`);
console.log(`  - Coffee Batches: ${batchCount}`);
console.log(`  - Coffee Servers: ${counts.coffee_servers}`);
console.log(`  - Recipes: ${counts.recipes}`);
console.log(`  - Brews: ${counts.brews}`);
console.log(`  - Brew Templates: ${counts.brew_templates}`);
console.log(`  - Password Reset Tokens: ${counts.password_reset_tokens}`);
console.log('');

// Check for user uploads folder
const userUploadsPath = path.join(UPLOADS_PATH, String(user.id));
const hasUploadsFolder = fs.existsSync(userUploadsPath);
if (hasUploadsFolder) {
  const files = fs.readdirSync(userUploadsPath);
  console.log(`User uploads folder: ${userUploadsPath}`);
  console.log(`  - Files: ${files.length}`);
  console.log('');
}

if (dryRun) {
  console.log('✅ Dry run complete. Run without --dry-run to delete.');
  db.close();
  process.exit(0);
}

// Perform deletion
console.log('Deleting user data...');

db.exec('BEGIN TRANSACTION');

try {
  // Delete in order respecting foreign key constraints
  
  // 1. Delete password reset tokens
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
  console.log('  ✓ Deleted password reset tokens');

  // 2. Delete brews (references recipes, grinders, brewers, coffee_beans, batches)
  db.prepare('DELETE FROM brews WHERE user_id = ?').run(user.id);
  console.log('  ✓ Deleted brews');

  // 3. Delete coffee batches (references coffee_beans)
  if (beanIds.length > 0) {
    const placeholders = beanIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM coffee_batches WHERE coffee_bean_id IN (${placeholders})`).run(...beanIds.map(b => b.id));
  }
  console.log('  ✓ Deleted coffee batches');

  // 4. Delete recipes (references grinders, brewers)
  db.prepare('DELETE FROM recipes WHERE user_id = ?').run(user.id);
  console.log('  ✓ Deleted recipes');

  // 5. Delete equipment
  db.prepare('DELETE FROM grinders WHERE user_id = ?').run(user.id);
  console.log('  ✓ Deleted grinders');

  db.prepare('DELETE FROM brewers WHERE user_id = ?').run(user.id);
  console.log('  ✓ Deleted brewers');

  db.prepare('DELETE FROM coffee_servers WHERE user_id = ?').run(user.id);
  console.log('  ✓ Deleted coffee servers');

  // 6. Delete coffee beans
  db.prepare('DELETE FROM coffee_beans WHERE user_id = ?').run(user.id);
  console.log('  ✓ Deleted coffee beans');

  // 7. Delete brew templates
  db.prepare('DELETE FROM brew_templates WHERE user_id = ?').run(user.id);
  console.log('  ✓ Deleted brew templates');

  // 8. Delete user
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  console.log('  ✓ Deleted user');

  db.exec('COMMIT');
  console.log('');
  console.log('✅ Database records deleted successfully');

  // Delete uploads folder
  if (hasUploadsFolder) {
    fs.rmSync(userUploadsPath, { recursive: true, force: true });
    console.log('✅ User uploads folder deleted');
  }

  console.log('');
  console.log(`🗑️  User "${user.name}" (${user.email}) has been deleted.`);

} catch (error) {
  db.exec('ROLLBACK');
  console.error('');
  console.error('❌ Error during deletion:', error);
  process.exit(1);
} finally {
  db.close();
}
