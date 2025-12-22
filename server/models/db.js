import pg from 'pg';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isPostgres = !!process.env.DATABASE_URL;

let db;
let pool;

if (isPostgres) {
    console.log('Using PostgreSQL database');
    pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    console.log('Using SQLite database');
    const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', '..', 'database', 'proofing.db');
    // Ensure directory exists
    const dbDir = dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
}

// Helper to convert SQLite '?' params to Postgres '$1', '$2' etc.
const convertSql = (sql) => {
    if (!isPostgres) return sql;
    let i = 1;
    return sql.replace(/\?/g, () => `$${i++}`);
};

const adapter = {
    // Execute a query that returns multiple rows
    query: async (sql, params = []) => {
        if (isPostgres) {
            const { rows } = await pool.query(convertSql(sql), params);
            return rows;
        } else {
            return db.prepare(sql).all(params);
        }
    },

    // Execute a query that returns a single row
    get: async (sql, params = []) => {
        if (isPostgres) {
            const { rows } = await pool.query(convertSql(sql), params);
            return rows[0];
        } else {
            return db.prepare(sql).get(params);
        }
    },

    // Execute a query that returns no rows (INSERT, UPDATE, DELETE)
    run: async (sql, params = []) => {
        if (isPostgres) {
            let query = convertSql(sql);
            // Auto-append RETURNING id for INSERTs to get lastInsertRowid
            if (query.trim().toUpperCase().startsWith('INSERT') && !query.toUpperCase().includes('RETURNING')) {
                query += ' RETURNING id';
            }
            const res = await pool.query(query, params);
            return {
                lastInsertRowid: res.rows[0]?.id,
                changes: res.rowCount
            };
        } else {
            const info = db.prepare(sql).run(params);
            return {
                lastInsertRowid: info.lastInsertRowid,
                changes: info.changes
            };
        }
    },

    // Special method for initialization scripts
    exec: async (sql) => {
        if (isPostgres) {
            await pool.query(sql);
        } else {
            db.exec(sql);
        }
    },

    isPostgres
};

export default adapter;
