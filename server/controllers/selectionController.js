import db from '../models/database.js';
import { broadcast } from '../index.js';

// Toggle photo selection
export const toggleSelection = (req, res) => {
    try {
        const { photo_id, gallery_id, client_identifier } = req.body;

        if (!photo_id || !gallery_id || !client_identifier) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if selection exists
        const existing = db.prepare(`
      SELECT * FROM selections WHERE photo_id = ? AND client_identifier = ?
    `).get(photo_id, client_identifier);

        if (existing) {
            // Remove selection
            db.prepare('DELETE FROM selections WHERE id = ?').run(existing.id);

            const count = db.prepare(`
        SELECT COUNT(*) as count FROM selections WHERE gallery_id = ? AND client_identifier = ?
      `).get(gallery_id, client_identifier);

            res.json({
                selected: false,
                message: 'Photo deselected',
                totalSelected: count.count
            });
        } else {
            // Add selection
            db.prepare(`
        INSERT INTO selections (photo_id, gallery_id, client_identifier, status)
        VALUES (?, ?, ?, 'pending')
      `).run(photo_id, gallery_id, client_identifier);

            const count = db.prepare(`
        SELECT COUNT(*) as count FROM selections WHERE gallery_id = ? AND client_identifier = ?
      `).get(gallery_id, client_identifier);

            // Create notification
            const photo = db.prepare('SELECT original_name FROM photos WHERE id = ?').get(photo_id);
            db.prepare(`
        INSERT INTO notifications (gallery_id, type, message, data)
        VALUES (?, 'selection', ?, ?)
      `).run(gallery_id, `Photo selected: ${photo.original_name}`, JSON.stringify({ photo_id, client_identifier }));

            // Broadcast to admin
            broadcast(gallery_id, { type: 'selection', photo_id, client_identifier, action: 'add' });

            res.json({
                selected: true,
                message: 'Photo selected',
                totalSelected: count.count
            });
        }
    } catch (error) {
        console.error('Toggle selection error:', error);
        res.status(500).json({ error: 'Failed to toggle selection' });
    }
};

// Select all photos
export const selectAll = (req, res) => {
    try {
        const { gallery_id, client_identifier } = req.body;

        const photos = db.prepare('SELECT id FROM photos WHERE gallery_id = ?').all(gallery_id);

        for (const photo of photos) {
            db.prepare(`
        INSERT OR IGNORE INTO selections (photo_id, gallery_id, client_identifier, status)
        VALUES (?, ?, ?, 'pending')
      `).run(photo.id, gallery_id, client_identifier);
        }

        const count = db.prepare(`
      SELECT COUNT(*) as count FROM selections WHERE gallery_id = ? AND client_identifier = ?
    `).get(gallery_id, client_identifier);

        // Create notification
        db.prepare(`
      INSERT INTO notifications (gallery_id, type, message, data)
      VALUES (?, 'selection', ?, ?)
    `).run(gallery_id, `All ${photos.length} photos selected`, JSON.stringify({ client_identifier }));

        broadcast(gallery_id, { type: 'select_all', client_identifier, count: photos.length });

        res.json({ message: 'All photos selected', totalSelected: count.count });
    } catch (error) {
        console.error('Select all error:', error);
        res.status(500).json({ error: 'Failed to select all' });
    }
};

// Deselect all photos
export const deselectAll = (req, res) => {
    try {
        const { gallery_id, client_identifier } = req.body;

        db.prepare(`
      DELETE FROM selections WHERE gallery_id = ? AND client_identifier = ?
    `).run(gallery_id, client_identifier);

        broadcast(gallery_id, { type: 'deselect_all', client_identifier });

        res.json({ message: 'All photos deselected', totalSelected: 0 });
    } catch (error) {
        console.error('Deselect all error:', error);
        res.status(500).json({ error: 'Failed to deselect all' });
    }
};

// Get selections for a gallery (client)
export const getSelections = (req, res) => {
    try {
        const { gallery_id, client_identifier } = req.query;

        const selections = db.prepare(`
      SELECT s.*, p.filename, p.thumbnail_path, p.original_name
      FROM selections s
      JOIN photos p ON s.photo_id = p.id
      WHERE s.gallery_id = ? AND s.client_identifier = ?
    `).all(gallery_id, client_identifier);

        res.json({ selections, count: selections.length });
    } catch (error) {
        console.error('Get selections error:', error);
        res.status(500).json({ error: 'Failed to get selections' });
    }
};

// Approve selection (admin)
export const approveSelection = (req, res) => {
    try {
        const { id } = req.params;

        const selection = db.prepare(`
      SELECT s.* FROM selections s
      JOIN galleries g ON s.gallery_id = g.id
      WHERE s.id = ? AND g.admin_id = ?
    `).get(id, req.user.id);

        if (!selection) {
            return res.status(404).json({ error: 'Selection not found' });
        }

        db.prepare('UPDATE selections SET status = ? WHERE id = ?').run('approved', id);

        res.json({ message: 'Selection approved' });
    } catch (error) {
        console.error('Approve selection error:', error);
        res.status(500).json({ error: 'Failed to approve selection' });
    }
};

// Reject selection (admin)
export const rejectSelection = (req, res) => {
    try {
        const { id } = req.params;

        const selection = db.prepare(`
      SELECT s.* FROM selections s
      JOIN galleries g ON s.gallery_id = g.id
      WHERE s.id = ? AND g.admin_id = ?
    `).get(id, req.user.id);

        if (!selection) {
            return res.status(404).json({ error: 'Selection not found' });
        }

        db.prepare('UPDATE selections SET status = ? WHERE id = ?').run('rejected', id);

        res.json({ message: 'Selection rejected' });
    } catch (error) {
        console.error('Reject selection error:', error);
        res.status(500).json({ error: 'Failed to reject selection' });
    }
};

// Bulk approve selections (admin)
export const bulkApprove = (req, res) => {
    try {
        const { selection_ids } = req.body;

        if (!selection_ids || !Array.isArray(selection_ids)) {
            return res.status(400).json({ error: 'Selection IDs array required' });
        }

        const placeholders = selection_ids.map(() => '?').join(',');
        db.prepare(`
      UPDATE selections SET status = 'approved' 
      WHERE id IN (${placeholders})
    `).run(...selection_ids);

        res.json({ message: `${selection_ids.length} selections approved` });
    } catch (error) {
        console.error('Bulk approve error:', error);
        res.status(500).json({ error: 'Failed to approve selections' });
    }
};

// Bulk reject selections (admin)
export const bulkReject = (req, res) => {
    try {
        const { selection_ids } = req.body;

        if (!selection_ids || !Array.isArray(selection_ids)) {
            return res.status(400).json({ error: 'Selection IDs array required' });
        }

        const placeholders = selection_ids.map(() => '?').join(',');
        db.prepare(`
      UPDATE selections SET status = 'rejected' 
      WHERE id IN (${placeholders})
    `).run(...selection_ids);

        res.json({ message: `${selection_ids.length} selections rejected` });
    } catch (error) {
        console.error('Bulk reject error:', error);
        res.status(500).json({ error: 'Failed to reject selections' });
    }
};

// Get all selections for a gallery (admin)
export const getGallerySelections = (req, res) => {
    try {
        const { gallery_id } = req.params;

        const gallery = db.prepare('SELECT * FROM galleries WHERE id = ? AND admin_id = ?')
            .get(gallery_id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const selections = db.prepare(`
      SELECT s.*, p.filename, p.thumbnail_path, p.original_name
      FROM selections s
      JOIN photos p ON s.photo_id = p.id
      WHERE s.gallery_id = ?
      ORDER BY s.created_at DESC
    `).all(gallery_id);

        // Group by client
        const grouped = selections.reduce((acc, sel) => {
            if (!acc[sel.client_identifier]) {
                acc[sel.client_identifier] = [];
            }
            acc[sel.client_identifier].push(sel);
            return acc;
        }, {});

        res.json({ selections, grouped, total: selections.length });
    } catch (error) {
        console.error('Get gallery selections error:', error);
        res.status(500).json({ error: 'Failed to get selections' });
    }
};

// Toggle favorite
export const toggleFavorite = (req, res) => {
    try {
        const { photo_id, gallery_id, client_identifier } = req.body;

        const existing = db.prepare(`
      SELECT * FROM favorites WHERE photo_id = ? AND client_identifier = ?
    `).get(photo_id, client_identifier);

        if (existing) {
            db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
            res.json({ favorited: false, message: 'Removed from favorites' });
        } else {
            db.prepare(`
        INSERT INTO favorites (photo_id, gallery_id, client_identifier)
        VALUES (?, ?, ?)
      `).run(photo_id, gallery_id, client_identifier);

            // Create notification
            const photo = db.prepare('SELECT original_name FROM photos WHERE id = ?').get(photo_id);
            db.prepare(`
        INSERT INTO notifications (gallery_id, type, message, data)
        VALUES (?, 'favorite', ?, ?)
      `).run(gallery_id, `Photo favorited: ${photo.original_name}`, JSON.stringify({ photo_id, client_identifier }));

            broadcast(gallery_id, { type: 'favorite', photo_id, client_identifier });

            res.json({ favorited: true, message: 'Added to favorites' });
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
};

// Get favorites (client)
export const getFavorites = (req, res) => {
    try {
        const { gallery_id, client_identifier } = req.query;

        const favorites = db.prepare(`
      SELECT f.*, p.filename, p.thumbnail_path, p.original_name
      FROM favorites f
      JOIN photos p ON f.photo_id = p.id
      WHERE f.gallery_id = ? AND f.client_identifier = ?
    `).all(gallery_id, client_identifier);

        res.json({ favorites, count: favorites.length });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Failed to get favorites' });
    }
};
