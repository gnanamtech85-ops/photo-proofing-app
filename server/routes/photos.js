import { Router } from 'express';
import upload from '../middleware/upload.js';
import {
    uploadPhotos, getPhotos, deletePhoto, bulkDeletePhotos,
    movePhotos, updatePhotoTags, servePhoto, searchPhotos
} from '../controllers/photoController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Serve photos (public with filename) - Only used for local storage
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
