import { v4 as uuidv4 } from 'uuid';
import db from '../models/database.js';
import QRCode from 'qrcode';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Get all galleries for admin
export const getGalleries = (req, res) => {
    try {
        const galleries = db.prepare(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM photos WHERE gallery_id = g.id) as photo_count,
        (SELECT COUNT(*) FROM selections WHERE gallery_id = g.id AND status = 'pending') as pending_selections,
        (SELECT COUNT(*) FROM favorites WHERE gallery_id = g.id) as favorites_count
      FROM galleries g 
      WHERE g.admin_id = ?
      ORDER BY g.created_at DESC
    `).all(req.user.id);

        res.json({ galleries });
    } catch (error) {
        console.error('Get galleries error:', error);
        res.status(500).json({ error: 'Failed to fetch galleries' });
    }
};

// Get single gallery
export const getGallery = (req, res) => {
    try {
        const gallery = db.prepare(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM photos WHERE gallery_id = g.id) as photo_count,
        (SELECT COUNT(*) FROM selections WHERE gallery_id = g.id) as selection_count,
        (SELECT COUNT(*) FROM favorites WHERE gallery_id = g.id) as favorites_count
      FROM galleries g 
      WHERE g.id = ? AND g.admin_id = ?
    `).get(req.params.id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const photos = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM selections WHERE photo_id = p.id) as selection_count,
        (SELECT COUNT(*) FROM favorites WHERE photo_id = p.id) as favorites_count
      FROM photos p 
      WHERE p.gallery_id = ?
      ORDER BY p.uploaded_at DESC
    `).all(req.params.id);

        const folders = db.prepare('SELECT * FROM folders WHERE gallery_id = ?').all(req.params.id);

        res.json({ gallery, photos, folders });
    } catch (error) {
        console.error('Get gallery error:', error);
        res.status(500).json({ error: 'Failed to fetch gallery' });
    }
};

// Create gallery
export const createGallery = async (req, res) => {
    try {
        const {
            name,
            description,
            password,
            expiry_date,
            allow_download = 1,
            allow_bulk_download = 1,
            allow_client_upload = 0,
            watermark_enabled = 1,
            watermark_text,
            watermark_logo,
            watermark_opacity = 0.5,
            watermark_font = 'Arial',
            watermark_size = 24,
            watermark_position = 'bottom-right'
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Gallery name is required' });
        }

        const shareLink = uuidv4();
        const hashedPassword = password || null;

        const result = db.prepare(`
      INSERT INTO galleries (
        admin_id, name, description, share_link, password, expiry_date,
        allow_download, allow_bulk_download, allow_client_upload,
        watermark_enabled, watermark_text, watermark_logo, watermark_opacity,
        watermark_font, watermark_size, watermark_position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            req.user.id, name, description, shareLink, hashedPassword, expiry_date,
            allow_download, allow_bulk_download, allow_client_upload,
            watermark_enabled, watermark_text, watermark_logo, watermark_opacity,
            watermark_font, watermark_size, watermark_position
        );

        const gallery = db.prepare('SELECT * FROM galleries WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Gallery created successfully',
            gallery,
            shareUrl: `${FRONTEND_URL}/gallery/${shareLink}`
        });
    } catch (error) {
        console.error('Create gallery error:', error);
        res.status(500).json({ error: 'Failed to create gallery' });
    }
};

// Update gallery
export const updateGallery = (req, res) => {
    try {
        const gallery = db.prepare('SELECT * FROM galleries WHERE id = ? AND admin_id = ?')
            .get(req.params.id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const fields = [
            'name', 'description', 'password', 'expiry_date',
            'allow_download', 'allow_bulk_download', 'allow_client_upload',
            'watermark_enabled', 'watermark_text', 'watermark_logo',
            'watermark_opacity', 'watermark_font', 'watermark_size', 'watermark_position',
            'cover_photo', 'status'
        ];

        const updates = [];
        const values = [];

        for (const field of fields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.params.id);
        db.prepare(`UPDATE galleries SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const updatedGallery = db.prepare('SELECT * FROM galleries WHERE id = ?').get(req.params.id);
        res.json({ message: 'Gallery updated', gallery: updatedGallery });
    } catch (error) {
        console.error('Update gallery error:', error);
        res.status(500).json({ error: 'Failed to update gallery' });
    }
};

// Delete gallery
export const deleteGallery = (req, res) => {
    try {
        const result = db.prepare('DELETE FROM galleries WHERE id = ? AND admin_id = ?')
            .run(req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        res.json({ message: 'Gallery deleted successfully' });
    } catch (error) {
        console.error('Delete gallery error:', error);
        res.status(500).json({ error: 'Failed to delete gallery' });
    }
};

// Get QR code for gallery
export const getGalleryQR = async (req, res) => {
    try {
        const gallery = db.prepare('SELECT share_link FROM galleries WHERE id = ? AND admin_id = ?')
            .get(req.params.id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const shareUrl = `${FRONTEND_URL}/gallery/${gallery.share_link}`;
        const qrCode = await QRCode.toDataURL(shareUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });

        res.json({ qrCode, shareUrl });
    } catch (error) {
        console.error('Get QR code error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
};

// Get gallery stats
export const getGalleryStats = (req, res) => {
    try {
        const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM galleries WHERE admin_id = ?) as total_galleries,
        (SELECT COUNT(*) FROM photos p JOIN galleries g ON p.gallery_id = g.id WHERE g.admin_id = ?) as total_photos,
        (SELECT COUNT(*) FROM selections s JOIN galleries g ON s.gallery_id = g.id WHERE g.admin_id = ? AND s.status = 'pending') as pending_selections,
        (SELECT COUNT(*) FROM favorites f JOIN galleries g ON f.gallery_id = g.id WHERE g.admin_id = ?) as total_favorites,
        (SELECT COUNT(*) FROM notifications n JOIN galleries g ON n.gallery_id = g.id WHERE g.admin_id = ? AND n.read = 0) as unread_notifications
    `).get(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

        res.json({ stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

// Create folder in gallery
export const createFolder = (req, res) => {
    try {
        const { name, parent_id } = req.body;
        const { id: gallery_id } = req.params;

        const gallery = db.prepare('SELECT id FROM galleries WHERE id = ? AND admin_id = ?')
            .get(gallery_id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const result = db.prepare('INSERT INTO folders (gallery_id, name, parent_id) VALUES (?, ?, ?)')
            .run(gallery_id, name, parent_id || null);

        const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ message: 'Folder created', folder });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
};

// Delete folder
export const deleteFolder = (req, res) => {
    try {
        const { id: gallery_id, folderId } = req.params;

        const gallery = db.prepare('SELECT id FROM galleries WHERE id = ? AND admin_id = ?')
            .get(gallery_id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        // Move photos to root (null folder_id)
        db.prepare('UPDATE photos SET folder_id = NULL WHERE folder_id = ?').run(folderId);

        // Delete folder
        db.prepare('DELETE FROM folders WHERE id = ? AND gallery_id = ?').run(folderId, gallery_id);

        res.json({ message: 'Folder deleted' });
    } catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
};
