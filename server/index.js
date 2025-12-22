import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import galleryRoutes from './routes/galleries.js';
import photoRoutes from './routes/photos.js';
import selectionRoutes from './routes/selections.js';
import clientRoutes from './routes/client.js';

// Import database to initialize it
import './models/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { dirname } from 'path';

const app = express();
const server = createServer(app);

// WebSocket server for real-time notifications
const wss = new WebSocketServer({ server, path: '/ws' });

// Store connected clients by gallery
const galleryClients = new Map();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const galleryId = url.searchParams.get('gallery');

    if (galleryId) {
        if (!galleryClients.has(galleryId)) {
            galleryClients.set(galleryId, new Set());
        }
        galleryClients.get(galleryId).add(ws);

        ws.on('close', () => {
            galleryClients.get(galleryId)?.delete(ws);
        });
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('WS message:', data);
        } catch (e) {
            console.error('Invalid WS message');
        }
    });
});

// Broadcast function for real-time updates
export const broadcast = (galleryId, data) => {
    const clients = galleryClients.get(String(galleryId));
    if (clients) {
        const message = JSON.stringify(data);
        clients.forEach(client => {
            if (client.readyState === 1) { // OPEN
                client.send(message);
            }
        });
    }
};

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/galleries', galleryRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/selections', selectionRoutes);
app.use('/api/client', clientRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientDistPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║   Photo Proofing Server Running                            ║
╠════════════════════════════════════════════════════════════╣
║   API:        http://localhost:${PORT}/api                    ║
║   WebSocket:  ws://localhost:${PORT}/ws                       ║
║   Health:     http://localhost:${PORT}/api/health             ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
