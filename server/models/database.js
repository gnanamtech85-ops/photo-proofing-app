import db from './db.js';
import bcrypt from 'bcryptjs';

const initDb = async () => {
  const isPostgres = db.isPostgres;

  // Define types based on DB
  const SERIAL_PK = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const TIMESTAMP = isPostgres ? 'TIMESTAMP' : 'DATETIME';
  const JSON_TYPE = isPostgres ? 'TEXT' : 'TEXT'; // SQLite stores JSON as TEXT anyway

  console.log(`Initializing ${isPostgres ? 'PostgreSQL' : 'SQLite'} database...`);

  // Users
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id ${SERIAL_PK},
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'client' CHECK(role IN ('admin', 'client')),
      avatar TEXT,
      created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Galleries
  await db.exec(`
    CREATE TABLE IF NOT EXISTS galleries (
      id ${SERIAL_PK},
      admin_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      share_link TEXT UNIQUE NOT NULL,
      password TEXT,
      expiry_date ${TIMESTAMP},
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
      created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Folders
  await db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id ${SERIAL_PK},
      gallery_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      parent_id INTEGER,
      created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );
  `);

  // Photos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id ${SERIAL_PK},
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
      uploaded_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );
  `);

  // Selections
  await db.exec(`
    CREATE TABLE IF NOT EXISTS selections (
      id ${SERIAL_PK},
      photo_id INTEGER NOT NULL,
      gallery_id INTEGER NOT NULL,
      client_identifier TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
      UNIQUE(photo_id, client_identifier)
    );
  `);

  // Favorites
  await db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id ${SERIAL_PK},
      photo_id INTEGER NOT NULL,
      gallery_id INTEGER NOT NULL,
      client_identifier TEXT NOT NULL,
      created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
      UNIQUE(photo_id, client_identifier)
    );
  `);

  // Notifications
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id ${SERIAL_PK},
      gallery_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
    );
  `);

  // Gallery Access
  await db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_access (
      id ${SERIAL_PK},
      gallery_id INTEGER NOT NULL,
      client_identifier TEXT NOT NULL,
      client_name TEXT,
      client_email TEXT,
      last_accessed ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
      UNIQUE(gallery_id, client_identifier)
    );
  `);

  // Indices
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_gallery ON photos(gallery_id);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_selections_gallery ON selections(gallery_id);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_selections_client ON selections(client_identifier);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_favorites_gallery ON favorites(gallery_id);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_gallery ON notifications(gallery_id);`);

  await createDefaultAdmin();
};

const createDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@photoproof.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    await db.run(`
      INSERT INTO users (email, password, name, role) 
      VALUES (?, ?, 'Admin', 'admin')
    `, [adminEmail, hashedPassword]);
    console.log(`Default admin created: ${adminEmail}`);
  }
};

// Run initialization
initDb().catch(console.error);

export default db;
