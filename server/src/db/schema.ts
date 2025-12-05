import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/brew-journal.db');

export const db: DatabaseType = new Database(dbPath);

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      name TEXT NOT NULL,
      auth_provider TEXT DEFAULT 'email',
      provider_id TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grinders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      photo TEXT,
      burr_type TEXT NOT NULL,
      ideal_for TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS brewers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      photo TEXT,
      type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coffee_beans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      photo TEXT,
      name TEXT NOT NULL,
      roaster TEXT,
      country TEXT,
      region TEXT,
      altitude TEXT,
      varietal TEXT,
      process TEXT,
      roast_level TEXT,
      roast_for TEXT,
      tasting_notes TEXT,
      url TEXT,
      favorite INTEGER DEFAULT 0,
      low_stock_threshold INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coffee_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coffee_bean_id INTEGER NOT NULL,
      price REAL,
      roast_date TEXT,
      weight REAL,
      current_weight REAL,
      purchase_date TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coffee_bean_id) REFERENCES coffee_beans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      grinder_id INTEGER,
      brewer_id INTEGER,
      ratio TEXT,
      dose REAL,
      photo TEXT,
      process TEXT,
      process_steps TEXT,
      grind_size REAL,
      water REAL,
      yield REAL,
      temperature REAL,
      brew_time TEXT,
      favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (grinder_id) REFERENCES grinders(id),
      FOREIGN KEY (brewer_id) REFERENCES brewers(id)
    );

    CREATE TABLE IF NOT EXISTS brews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      coffee_bean_id INTEGER,
      batch_id INTEGER,
      grinder_id INTEGER,
      brewer_id INTEGER,
      recipe_id INTEGER,
      dose REAL,
      grind_size REAL,
      water REAL,
      yield REAL,
      temperature REAL,
      brew_time TEXT,
      tds REAL,
      extraction_yield REAL,
      rating INTEGER,
      comment TEXT,
      photo TEXT,
      favorite INTEGER DEFAULT 0,
      template_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (coffee_bean_id) REFERENCES coffee_beans(id),
      FOREIGN KEY (batch_id) REFERENCES coffee_batches(id),
      FOREIGN KEY (grinder_id) REFERENCES grinders(id),
      FOREIGN KEY (brewer_id) REFERENCES brewers(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );

    CREATE TABLE IF NOT EXISTS brew_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      fields TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coffee_servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      photo TEXT,
      max_volume REAL,
      empty_weight REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Add coffee_server_id column to brews if it doesn't exist
  const brewsColumns = db.prepare("PRAGMA table_info(brews)").all() as any[];
  if (!brewsColumns.some((col: any) => col.name === 'coffee_server_id')) {
    db.exec(`ALTER TABLE brews ADD COLUMN coffee_server_id INTEGER REFERENCES coffee_servers(id)`);
  }

  // Add social auth columns to users if they don't exist
  const usersColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
  if (!usersColumns.some((col: any) => col.name === 'auth_provider')) {
    db.exec(`ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'`);
  }
  if (!usersColumns.some((col: any) => col.name === 'provider_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN provider_id TEXT`);
  }
  if (!usersColumns.some((col: any) => col.name === 'avatar_url')) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  }

  // Migrate users table to make password nullable (for social auth)
  const passwordCol = usersColumns.find((col: any) => col.name === 'password');
  if (passwordCol && passwordCol.notnull === 1) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT NOT NULL,
        auth_provider TEXT DEFAULT 'email',
        provider_id TEXT,
        avatar_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users_new (id, email, password, name, auth_provider, provider_id, avatar_url, created_at)
        SELECT id, email, password, name, 
          COALESCE(auth_provider, 'email'), 
          provider_id, 
          avatar_url, 
          created_at 
        FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      PRAGMA foreign_keys=ON;
    `);
  }

  // Add source column to coffee_beans if it doesn't exist
  const beansColumns = db.prepare("PRAGMA table_info(coffee_beans)").all() as any[];
  if (!beansColumns.some((col: any) => col.name === 'source')) {
    db.exec(`ALTER TABLE coffee_beans ADD COLUMN source TEXT DEFAULT 'manual'`);
  }
}
