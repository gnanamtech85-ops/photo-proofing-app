import db from '../models/database.js';
import bcrypt from 'bcryptjs';

// Get gallery by share link (client access)
export const getGalleryByLink = async (req, res) => {
    try {
        const { shareLink } = req.params;
        const { password, client_identifier } = req.query;

        const gallery = await db.get(`
      SELECT g.*, u.name as admin_name
      FROM galleries g
      JOIN users u ON g.admin_id = u.id
      WHERE g.share_link = ?
    `, [shareLink]);

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
        const photos = await db.query(`
      SELECT p.*,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END as is_selected,
        s.status as selection_status,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
      FROM photos p
      LEFT JOIN selections s ON p.id = s.photo_id AND s.client_identifier = ?
      LEFT JOIN favorites f ON p.id = f.photo_id AND f.client_identifier = ?
      WHERE p.gallery_id = ?
      ORDER BY p.uploaded_at DESC
    `, [client_identifier || '', client_identifier || '', gallery.id]);

        const folders = await db.query('SELECT * FROM folders WHERE gallery_id = ?', [gallery.id]);

        // Get selection count for this client
        const selectionCount = await db.get(`
      SELECT COUNT(*) as count FROM selections WHERE gallery_id = ? AND client_identifier = ?
    `, [gallery.id, client_identifier || '']);

        // Update or create gallery access record
        if (client_identifier) {
            // Postgres supports ON CONFLICT, SQLite supports INSERT OR IGNORE or ON CONFLICT
            // Both support ON CONFLICT in modern versions.
            // Let's assume standard SQL ON CONFLICT works for both (SQLite 3.24+)

            await db.run(`
                INSERT INTO gallery_access (gallery_id, client_identifier, last_accessed)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(gallery_id, client_identifier) 
                DO UPDATE SET last_accessed = CURRENT_TIMESTAMP
            `, [gallery.id, client_identifier]);
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

        const gallery = await db.get('SELECT * FROM galleries WHERE share_link = ?', [shareLink]);

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
export const downloadPhoto = async (req, res) => {
    try {
        const { shareLink, photoId } = req.params;
        const { client_identifier } = req.query;

        const gallery = await db.get('SELECT * FROM galleries WHERE share_link = ?', [shareLink]);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        if (!gallery.allow_download) {
            return res.status(403).json({ error: 'Downloads not allowed for this gallery' });
        }

        const photo = await db.get('SELECT * FROM photos WHERE id = ? AND gallery_id = ?', [photoId, gallery.id]);

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Check if selection is approved (if selections exist)
        const selection = await db.get(`
      SELECT * FROM selections WHERE photo_id = ? AND client_identifier = ?
    `, [photoId, client_identifier]);

        if (selection && selection.status !== 'approved') {
            return res.status(403).json({
                error: 'Photo not approved for download',
                status: selection.status
            });
        }

        // Send the original file (not watermarked) for approved downloads
        // If Cloudinary, redirect to URL with attachment disposition?
        // Or stream it?
        // For simplicity, redirect to the URL.
        if (photo.original_path.startsWith('http')) {
            res.redirect(photo.original_path);
        } else {
            res.download(photo.original_path, photo.original_name);
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
};

// Get notifications (admin)
export const getNotifications = async (req, res) => {
    try {
        const notifications = await db.query(`
      SELECT n.*, g.name as gallery_name
      FROM notifications n
      JOIN galleries g ON n.gallery_id = g.id
      WHERE g.admin_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.user.id]);

        const unreadCount = await db.get(`
      SELECT COUNT(*) as count FROM notifications n
      JOIN galleries g ON n.gallery_id = g.id
      WHERE g.admin_id = ? AND n.read = 0
    `, [req.user.id]);

        res.json({ notifications, unreadCount: unreadCount.count });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

// Mark notification as read
export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;

        await db.run('UPDATE notifications SET read = 1 WHERE id = ?', [id]);

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
};

// Mark all notifications as read
export const markAllNotificationsRead = async (req, res) => {
    try {
        await db.run(`
      UPDATE notifications SET read = 1 
      WHERE gallery_id IN (SELECT id FROM galleries WHERE admin_id = ?)
    `, [req.user.id]);

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
};

// Get gallery access log (admin)
export const getGalleryAccessLog = async (req, res) => {
    try {
        const { gallery_id } = req.params;

        const gallery = await db.get('SELECT * FROM galleries WHERE id = ? AND admin_id = ?', [gallery_id, req.user.id]);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const accessLog = await db.query(`
      SELECT * FROM gallery_access WHERE gallery_id = ? ORDER BY last_accessed DESC
    `, [gallery_id]);

        res.json({ accessLog });
    } catch (error) {
        console.error('Get access log error:', error);
        res.status(500).json({ error: 'Failed to get access log' });
    }
};
