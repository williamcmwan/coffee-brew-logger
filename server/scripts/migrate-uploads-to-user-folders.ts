/**
 * Migrate Uploads to User Folders Script
 * 
 * This script migrates existing uploads from the flat structure to user-specific folders
 * and updates database references accordingly.
 * 
 * Usage:
 *   cd server && npm run migrate:uploads
 *   cd server && npm run migrate:uploads -- --dry-run
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data/brew-journal.db');
const uploadsBaseDir = path.join(process.cwd(), 'data/uploads');

const isDryRun = process.argv.includes('--dry-run');

console.log('=== Upload Migration Script ===\n');
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
console.log(`Database: ${dbPath}`);
console.log(`Uploads directory: ${uploadsBaseDir}\n`);

if (!fs.existsSync(dbPath)) {
  console.error('Error: Database not found');
  process.exit(1);
}

const db = new Database(dbPath);

function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .replace('@', '_at_')
    .replace(/[^a-z0-9._-]/g, '_');
}

function getUserEmail(userId: number): string | null {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;
  return user?.email || null;
}

const photoTables = [
  { table: 'grinders', photoCol: 'photo', userCol: 'user_id' },
  { table: 'brewers', photoCol: 'photo', userCol: 'user_id' },
  { table: 'recipes', photoCol: 'photo', userCol: 'user_id' },
  { table: 'coffee_beans', photoCol: 'photo', userCol: 'user_id' },
  { table: 'brews', photoCol: 'photo', userCol: 'user_id' },
  { table: 'coffee_servers', photoCol: 'photo', userCol: 'user_id' },
];

interface PhotoRecord {
  id: number;
  photo: string;
  user_id: number;
}

function migrate() {
  let totalMoved = 0;
  let totalUpdated = 0;
  let errors = 0;

  for (const { table, photoCol, userCol } of photoTables) {
    console.log(`\nProcessing ${table}...`);
    
    try {
      const rows = db.prepare(
        `SELECT id, ${photoCol} as photo, ${userCol} as user_id FROM ${table} WHERE ${photoCol} IS NOT NULL`
      ).all() as PhotoRecord[];
      
      for (const row of rows) {
        const photo = row.photo;
        
        // Skip if already in user folder format
        if (photo.match(/^\/uploads\/[^/]+\/[a-f0-9]{32}\.jpg$/)) {
          continue;
        }
        
        // Extract filename from old format (/uploads/filename.jpg)
        const oldMatch = photo.match(/^\/uploads\/([^/]+)$/);
        if (!oldMatch) {
          console.log(`  Skipping unknown format: ${photo}`);
          continue;
        }
        
        const filename = oldMatch[1];
        const email = getUserEmail(row.user_id);
        
        if (!email) {
          console.log(`  Warning: No email for user ${row.user_id}, skipping ${photo}`);
          continue;
        }
        
        const userFolder = sanitizeEmail(email);
        const oldPath = path.join(uploadsBaseDir, filename);
        const newDir = path.join(uploadsBaseDir, userFolder);
        const newPath = path.join(newDir, filename);
        const newUrl = `/uploads/${userFolder}/${filename}`;
        
        console.log(`  ${photo} → ${newUrl}`);
        
        if (!isDryRun) {
          try {
            if (!fs.existsSync(newDir)) {
              fs.mkdirSync(newDir, { recursive: true });
            }
            
            if (fs.existsSync(oldPath)) {
              fs.renameSync(oldPath, newPath);
              totalMoved++;
            } else if (!fs.existsSync(newPath)) {
              console.log(`    Warning: Source file not found`);
            }
            
            db.prepare(`UPDATE ${table} SET ${photoCol} = ? WHERE id = ?`).run(newUrl, row.id);
            totalUpdated++;
          } catch (e) {
            console.log(`    Error: ${e}`);
            errors++;
          }
        }
      }
    } catch (e) {
      console.log(`  Table error: ${e}`);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Files moved: ${totalMoved}`);
  console.log(`Database records updated: ${totalUpdated}`);
  console.log(`Errors: ${errors}`);
  
  if (isDryRun) {
    console.log('\n⚠ DRY RUN - No changes were made.');
  }
}

try {
  migrate();
} finally {
  db.close();
}
