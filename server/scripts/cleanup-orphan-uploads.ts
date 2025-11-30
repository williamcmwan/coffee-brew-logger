/**
 * Cleanup Orphan Uploads Script
 * 
 * Finds and removes uploaded files not referenced in any database record.
 * 
 * Usage:
 *   cd server && npm run cleanup:uploads
 *   cd server && npm run cleanup:uploads -- --dry-run
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data/brew-journal.db');
const uploadsBaseDir = path.join(process.cwd(), 'data/uploads');

const isDryRun = process.argv.includes('--dry-run');

console.log('=== Orphan Upload Cleanup Script ===\n');
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
console.log(`Database: ${dbPath}`);
console.log(`Uploads directory: ${uploadsBaseDir}\n`);

if (!fs.existsSync(dbPath)) {
  console.error('Error: Database not found at', dbPath);
  process.exit(1);
}

if (!fs.existsSync(uploadsBaseDir)) {
  console.log('Uploads directory does not exist. Nothing to clean up.');
  process.exit(0);
}

const db = new Database(dbPath);

function getAllReferencedPhotos(): Set<string> {
  const photos = new Set<string>();
  
  const queries = [
    'SELECT photo FROM grinders WHERE photo IS NOT NULL',
    'SELECT photo FROM brewers WHERE photo IS NOT NULL',
    'SELECT photo FROM recipes WHERE photo IS NOT NULL',
    'SELECT photo FROM coffee_beans WHERE photo IS NOT NULL',
    'SELECT photo FROM brews WHERE photo IS NOT NULL',
    'SELECT photo FROM coffee_servers WHERE photo IS NOT NULL',
  ];
  
  for (const query of queries) {
    try {
      const rows = db.prepare(query).all() as { photo: string }[];
      for (const row of rows) {
        if (row.photo) {
          photos.add(row.photo);
        }
      }
    } catch (e) {
      // Table might not exist
    }
  }
  
  return photos;
}

function getAllUploadedFiles(): string[] {
  const files: string[] = [];
  
  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
        const relativePath = path.relative(uploadsBaseDir, fullPath);
        const urlPath = '/uploads/' + relativePath.replace(/\\/g, '/');
        files.push(urlPath);
      }
    }
  }
  
  scanDir(uploadsBaseDir);
  return files;
}

function cleanup() {
  const referencedPhotos = getAllReferencedPhotos();
  const uploadedFiles = getAllUploadedFiles();
  
  console.log(`Found ${referencedPhotos.size} photo references in database`);
  console.log(`Found ${uploadedFiles.length} files in uploads directory\n`);
  
  const orphanFiles: string[] = [];
  
  for (const file of uploadedFiles) {
    if (!referencedPhotos.has(file)) {
      orphanFiles.push(file);
    }
  }
  
  if (orphanFiles.length === 0) {
    console.log('✓ No orphan files found. Everything is clean!');
    return;
  }
  
  console.log(`Found ${orphanFiles.length} orphan file(s):\n`);
  
  let totalSize = 0;
  for (const urlPath of orphanFiles) {
    const relativePath = urlPath.replace('/uploads/', '');
    const fullPath = path.join(uploadsBaseDir, relativePath);
    
    let fileSize = 0;
    try {
      const stats = fs.statSync(fullPath);
      fileSize = stats.size;
      totalSize += fileSize;
    } catch (e) {}
    
    const sizeStr = (fileSize / 1024).toFixed(1) + ' KB';
    console.log(`  ${urlPath} (${sizeStr})`);
    
    if (!isDryRun) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`    → Deleted`);
      } catch (e) {
        console.log(`    → Error: ${e}`);
      }
    }
  }
  
  console.log(`\nTotal: ${orphanFiles.length} files, ${(totalSize / 1024).toFixed(1)} KB`);
  
  if (isDryRun) {
    console.log('\n⚠ DRY RUN - No files were deleted.');
  } else {
    console.log('\n✓ Cleanup complete!');
    cleanupEmptyDirs();
  }
}

function cleanupEmptyDirs() {
  const entries = fs.readdirSync(uploadsBaseDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = path.join(uploadsBaseDir, entry.name);
      const files = fs.readdirSync(dirPath);
      
      if (files.length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`Removed empty directory: ${entry.name}`);
      }
    }
  }
}

try {
  cleanup();
} finally {
  db.close();
}
