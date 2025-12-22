import { Router } from 'express';
import {
    toggleSelection, selectAll, deselectAll, getSelections,
    approveSelection, rejectSelection, bulkApprove, bulkReject,
    getGallerySelections, toggleFavorite, getFavorites
} from '../controllers/selectionController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Client routes (no auth required - uses client_identifier)
router.post('/toggle', toggleSelection);
router.post('/select-all', selectAll);
router.post('/deselect-all', deselectAll);
router.get('/', getSelections);
router.post('/favorite', toggleFavorite);
router.get('/favorites', getFavorites);

// Admin routes
router.get('/gallery/:gallery_id', authenticate, requireAdmin, getGallerySelections);
router.put('/:id/approve', authenticate, requireAdmin, approveSelection);
router.put('/:id/reject', authenticate, requireAdmin, rejectSelection);
router.post('/bulk-approve', authenticate, requireAdmin, bulkApprove);
router.post('/bulk-reject', authenticate, requireAdmin, bulkReject);

export default router;
