const express = require('express');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(require('cors')());

// Configure Cloudinary (if available)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured');
}

// Database Connection
let pool;

try {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/photoshare';
  
  pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  // Test connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ PostgreSQL Connection Error:', err);
    } else {
      console.log('✅ Connected to PostgreSQL');
    }
  });
} catch (error) {
  console.error('❌ Database Setup Error:', error);
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'PhotoShare Pro API Running!',
    timestamp: new Date().toISOString(),
    database: pool ? 'Connected' : 'Not Connected',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not Configured'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
