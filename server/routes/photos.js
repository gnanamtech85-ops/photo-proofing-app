import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
    uploadPhotos, getPhotos, deletePhoto, bulkDeletePhotos,
    movePhotos, updatePhotoTags, servePhoto, searchPhotos
} from '../controllers/photoController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_DIR || './uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50000000 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        }
    }
});

// Serve photos (public with filename)
router.get('/file/:type/:filename', servePhoto);

// Admin routes
router.post('/upload', authenticate, requireAdmin, upload.array('photos', 100), uploadPhotos);
router.get('/gallery/:gallery_id', authenticate, requireAdmin, getPhotos);
router.get('/gallery/:gallery_id/search', authenticate, requireAdmin, searchPhotos);
router.delete('/:id', authenticate, requireAdmin, deletePhoto);
router.post('/bulk-delete', authenticate, requireAdmin, bulkDeletePhotos);
router.post('/move', authenticate, requireAdmin, movePhotos);
router.put('/:id/tags', authenticate, requireAdmin, updatePhotoTags);

export default router;
