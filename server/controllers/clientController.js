import db from '../models/database.js';
import bcrypt from 'bcryptjs';

// Get gallery by share link (client access)
export const getGalleryByLink = async (req, res) => {
    try {
        const { shareLink } = req.params;
        const { password, client_identifier } = req.query;

        const gallery = db.prepare(`
      SELECT g.*, u.name as admin_name
      FROM galleries g
      JOIN users u ON g.admin_id = u.id
      WHERE g.share_link = ?
    `).get(shareLink);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        // Check expiry
        if (gallery.expiry_date && new Date(gallery.expiry_date) < new Date()) {
            return res.status(403).json({ error: 'Gallery has expired', expired: true });
        }

        // Check password
        if (gallery.password) {
            if (!password) {
                return res.status(401).json({ error: 'Password required', requiresPassword: true });
            }
            if (password !== gallery.password) {
                return res.status(401).json({ error: 'Invalid password' });
            }
        }

        // Get photos with selection/favorite status for this client
        const photos = db.prepare(`
      SELECT p.*,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END as is_selected,
        s.status as selection_status,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
      FROM photos p
      LEFT JOIN selections s ON p.id = s.photo_id AND s.client_identifier = ?
      LEFT JOIN favorites f ON p.id = f.photo_id AND f.client_identifier = ?
      WHERE p.gallery_id = ?
      ORDER BY p.uploaded_at DESC
    `).all(client_identifier || '', client_identifier || '', gallery.id);

        const folders = db.prepare('SELECT * FROM folders WHERE gallery_id = ?').all(gallery.id);

        // Get selection count for this client
        const selectionCount = db.prepare(`
      SELECT COUNT(*) as count FROM selections WHERE gallery_id = ? AND client_identifier = ?
    `).get(gallery.id, client_identifier || '');

        // Update or create gallery access record
        if (client_identifier) {
            db.prepare(`
        INSERT INTO gallery_access (gallery_id, client_identifier, last_accessed)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(gallery_id, client_identifier) 
        DO UPDATE SET last_accessed = CURRENT_TIMESTAMP
      `).run(gallery.id, client_identifier);
        }

        // Remove sensitive fields
        delete gallery.password;
        delete gallery.admin_id;

        res.json({
            gallery: {
                ...gallery,
                allow_download: gallery.allow_download === 1,
                allow_bulk_download: gallery.allow_bulk_download === 1,
                allow_client_upload: gallery.allow_client_upload === 1
            },
            photos,
            folders,
            selectionCount: selectionCount.count
        });
    } catch (error) {
        console.error('Get gallery by link error:', error);
        res.status(500).json({ error: 'Failed to fetch gallery' });
    }
};

// Client uploads photo (if allowed)
export const clientUploadPhoto = async (req, res) => {
    try {
        const { shareLink } = req.params;
        const { client_identifier, client_name } = req.body;

        const gallery = db.prepare('SELECT * FROM galleries WHERE share_link = ?').get(shareLink);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        if (!gallery.allow_client_upload) {
            return res.status(403).json({ error: 'Client uploads not allowed for this gallery' });
        }

        // Check expiry
        if (gallery.expiry_date && new Date(gallery.expiry_date) < new Date()) {
            return res.status(403).json({ error: 'Gallery has expired' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Use existing upload logic but mark as client upload
        // This would integrate with photoController upload logic
        res.json({ message: 'Upload feature coming soon' });
    } catch (error) {
        console.error('Client upload error:', error);
        res.status(500).json({ error: 'Failed to upload' });
    }
};

// Get photo for download (check approval status)
export const downloadPhoto = (req, res) => {
    try {
        const { shareLink, photoId } = req.params;
        const { client_identifier } = req.query;

        const gallery = db.prepare('SELECT * FROM galleries WHERE share_link = ?').get(shareLink);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        if (!gallery.allow_download) {
            return res.status(403).json({ error: 'Downloads not allowed for this gallery' });
        }

        const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND gallery_id = ?')
            .get(photoId, gallery.id);

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Check if selection is approved (if selections exist)
        const selection = db.prepare(`
      SELECT * FROM selections WHERE photo_id = ? AND client_identifier = ?
    `).get(photoId, client_identifier);

        if (selection && selection.status !== 'approved') {
            return res.status(403).json({
                error: 'Photo not approved for download',
                status: selection.status
            });
        }

        // Send the original file (not watermarked) for approved downloads
        res.download(photo.original_path, photo.original_name);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
};

// Get notifications (admin)
export const getNotifications = (req, res) => {
    try {
        const notifications = db.prepare(`
      SELECT n.*, g.name as gallery_name
      FROM notifications n
      JOIN galleries g ON n.gallery_id = g.id
      WHERE g.admin_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(req.user.id);

        const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications n
      JOIN galleries g ON n.gallery_id = g.id
      WHERE g.admin_id = ? AND n.read = 0
    `).get(req.user.id);

        res.json({ notifications, unreadCount: unreadCount.count });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

// Mark notification as read
export const markNotificationRead = (req, res) => {
    try {
        const { id } = req.params;

        db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
};

// Mark all notifications as read
export const markAllNotificationsRead = (req, res) => {
    try {
        db.prepare(`
      UPDATE notifications SET read = 1 
      WHERE gallery_id IN (SELECT id FROM galleries WHERE admin_id = ?)
    `).run(req.user.id);

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
};

// Get gallery access log (admin)
export const getGalleryAccessLog = (req, res) => {
    try {
        const { gallery_id } = req.params;

        const gallery = db.prepare('SELECT * FROM galleries WHERE id = ? AND admin_id = ?')
            .get(gallery_id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const accessLog = db.prepare(`
      SELECT * FROM gallery_access WHERE gallery_id = ? ORDER BY last_accessed DESC
    `).all(gallery_id);

        res.json({ accessLog });
    } catch (error) {
        console.error('Get access log error:', error);
        res.status(500).json({ error: 'Failed to get access log' });
    }
};
