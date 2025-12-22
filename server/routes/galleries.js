import { Router } from 'express';
import {
    getGalleries, getGallery, createGallery, updateGallery, deleteGallery,
    getGalleryQR, getGalleryStats, createFolder, deleteFolder
} from '../controllers/galleryController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

router.get('/', getGalleries);
router.get('/stats', getGalleryStats);
router.get('/:id', getGallery);
router.post('/', createGallery);
router.put('/:id', updateGallery);
router.delete('/:id', deleteGallery);
router.get('/:id/qr', getGalleryQR);
router.post('/:id/folders', createFolder);
router.delete('/:id/folders/:folderId', deleteFolder);

export default router;
