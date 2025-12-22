import { Router } from 'express';
import {
    getGalleryByLink, clientUploadPhoto, downloadPhoto,
    getNotifications, markNotificationRead, markAllNotificationsRead,
    getGalleryAccessLog
} from '../controllers/clientController.js';
import { createSelectionsZip, createGalleryZip } from '../utils/zipGenerator.js';
import db from '../models/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public client routes
router.get('/gallery/:shareLink', getGalleryByLink);
router.get('/gallery/:shareLink/download/:photoId', downloadPhoto);

// ZIP download routes
router.get('/gallery/:shareLink/download-zip', async (req, res) => {
    try {
        const { shareLink } = req.params;
        const { client_identifier, filename } = req.query;

        const gallery = db.prepare('SELECT * FROM galleries WHERE share_link = ?').get(shareLink);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        if (!gallery.allow_bulk_download) {
            return res.status(403).json({ error: 'Bulk download not allowed' });
        }

        await createSelectionsZip(res, gallery.id, client_identifier, filename || gallery.name);
    } catch (error) {
        console.error('ZIP download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin routes
router.get('/notifications', authenticate, requireAdmin, getNotifications);
router.put('/notifications/:id/read', authenticate, requireAdmin, markNotificationRead);
router.put('/notifications/read-all', authenticate, requireAdmin, markAllNotificationsRead);
router.get('/gallery/:gallery_id/access-log', authenticate, requireAdmin, getGalleryAccessLog);

// Admin ZIP download
router.get('/admin/gallery/:id/download-zip', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { filename } = req.query;

        const gallery = db.prepare('SELECT * FROM galleries WHERE id = ? AND admin_id = ?')
            .get(id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        await createGalleryZip(res, gallery.id, filename || gallery.name);
    } catch (error) {
        console.error('Admin ZIP download error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
