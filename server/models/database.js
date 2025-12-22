import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', '..', 'database', 'proofing.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'client' CHECK(role IN ('admin', 'client')),
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS galleries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    share_link TEXT UNIQUE NOT NULL,
    password TEXT,
    expiry_date DATETIME,
    allow_download INTEGER DEFAULT 1,
    allow_bulk_download INTEGER DEFAULT 1,
    allow_client_upload INTEGER DEFAULT 0,
    watermark_enabled INTEGER DEFAULT 1,
    watermark_text TEXT,
    watermark_logo TEXT,
    watermark_opacity REAL DEFAULT 0.5,
    watermark_font TEXT DEFAULT 'Arial',
    watermark_size INTEGER DEFAULT 24,
    watermark_position TEXT DEFAULT 'bottom-right',
    cover_photo TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'archived')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gallery_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gallery_id INTEGER NOT NULL,
    folder_id INTEGER,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    original_path TEXT NOT NULL,
    thumbnail_path TEXT,
    watermarked_path TEXT,
    width INTEGER,
    height INTEGER,
    size INTEGER,
    mime_type TEXT,
    tags TEXT,
    face_group TEXT,
    color_palette TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL,
    gallery_id INTEGER NOT NULL,
    client_identifier TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
    UNIQUE(photo_id, client_identifier)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL,
    gallery_id INTEGER NOT NULL,
    client_identifier TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
    UNIQUE(photo_id, client_identifier)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gallery_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS gallery_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gallery_id INTEGER NOT NULL,
    client_identifier TEXT NOT NULL,
    client_name TEXT,
    client_email TEXT,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
    UNIQUE(gallery_id, client_identifier)
  );

  CREATE INDEX IF NOT EXISTS idx_photos_gallery ON photos(gallery_id);
  CREATE INDEX IF NOT EXISTS idx_selections_gallery ON selections(gallery_id);
  CREATE INDEX IF NOT EXISTS idx_selections_client ON selections(client_identifier);
  CREATE INDEX IF NOT EXISTS idx_favorites_gallery ON favorites(gallery_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_gallery ON notifications(gallery_id);
`);

// Create default admin user if not exists
const createDefaultAdmin = () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@photoproof.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

    if (!existingAdmin) {
        const hashedPassword = bcrypt.hashSync(adminPassword, 10);
        db.prepare(`
      INSERT INTO users (email, password, name, role) 
      VALUES (?, ?, 'Admin', 'admin')
    `).run(adminEmail, hashedPassword);
        console.log(`Default admin created: ${adminEmail}`);
    }
};

createDefaultAdmin();

export default db;
