import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import db from '../models/database.js';
import { applyWatermark } from '../middleware/watermark.js';
import { autoTag, detectFaces, extractColorPalette } from '../utils/aiFeatures.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Upload photos
export const uploadPhotos = async (req, res) => {
    try {
        const { gallery_id, folder_id } = req.body;

        const gallery = db.prepare('SELECT * FROM galleries WHERE id = ? AND admin_id = ?')
            .get(gallery_id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedPhotos = [];

        for (const file of req.files) {
            const filename = `${uuidv4()}${path.extname(file.originalname)}`;
            const originalPath = path.join(UPLOAD_DIR, 'originals', filename);
            const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', filename);
            const watermarkedPath = path.join(UPLOAD_DIR, 'watermarked', filename);

            // Move file to originals
            fs.renameSync(file.path, originalPath);

            // Get image metadata
            const metadata = await sharp(originalPath).metadata();

            // Generate thumbnail (400px width)
            await sharp(originalPath)
                .resize(400, null, { withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);

            // Apply watermark if enabled
            if (gallery.watermark_enabled) {
                await applyWatermark(originalPath, watermarkedPath, {
                    text: gallery.watermark_text,
                    logo: gallery.watermark_logo,
                    opacity: gallery.watermark_opacity,
                    font: gallery.watermark_font,
                    size: gallery.watermark_size,
                    position: gallery.watermark_position
                });
            } else {
                fs.copyFileSync(originalPath, watermarkedPath);
            }

            // AI features (preview)
            const tags = autoTag(file.originalname, metadata);
            const faceGroup = detectFaces(file.originalname);
            const colorPalette = extractColorPalette();

            // Insert into database
            const result = db.prepare(`
        INSERT INTO photos (
          gallery_id, folder_id, filename, original_name, original_path,
          thumbnail_path, watermarked_path, width, height, size, mime_type,
          tags, face_group, color_palette
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
                gallery_id, folder_id || null, filename, file.originalname,
                originalPath, thumbnailPath, watermarkedPath,
                metadata.width, metadata.height, file.size, file.mimetype,
                JSON.stringify(tags), faceGroup, JSON.stringify(colorPalette)
            );

            const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(result.lastInsertRowid);
            uploadedPhotos.push(photo);
        }

        res.status(201).json({
            message: `${uploadedPhotos.length} photos uploaded successfully`,
            photos: uploadedPhotos
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload photos' });
    }
};

// Get photos for a gallery (admin)
export const getPhotos = (req, res) => {
    try {
        const { gallery_id } = req.params;

        const gallery = db.prepare('SELECT * FROM galleries WHERE id = ? AND admin_id = ?')
            .get(gallery_id, req.user.id);

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const photos = db.prepare(`
      SELECT p.*,
        (SELECT GROUP_CONCAT(s.client_identifier || ':' || s.status) FROM selections s WHERE s.photo_id = p.id) as selections,
        (SELECT COUNT(*) FROM favorites WHERE photo_id = p.id) as favorites_count
      FROM photos p
      WHERE p.gallery_id = ?
      ORDER BY p.uploaded_at DESC
    `).all(gallery_id);

        res.json({ photos });
    } catch (error) {
        console.error('Get photos error:', error);
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
};

// Delete photo
export const deletePhoto = (req, res) => {
    try {
        const { id } = req.params;

        const photo = db.prepare(`
      SELECT p.* FROM photos p
      JOIN galleries g ON p.gallery_id = g.id
      WHERE p.id = ? AND g.admin_id = ?
    `).get(id, req.user.id);

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Delete files
        [photo.original_path, photo.thumbnail_path, photo.watermarked_path].forEach(filePath => {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        // Delete from database
        db.prepare('DELETE FROM photos WHERE id = ?').run(id);

        res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
};

// Bulk delete photos
export const bulkDeletePhotos = (req, res) => {
    try {
        const { photo_ids } = req.body;

        if (!photo_ids || !Array.isArray(photo_ids)) {
            return res.status(400).json({ error: 'Photo IDs array required' });
        }

        const placeholders = photo_ids.map(() => '?').join(',');
        const photos = db.prepare(`
      SELECT p.* FROM photos p
      JOIN galleries g ON p.gallery_id = g.id
      WHERE p.id IN (${placeholders}) AND g.admin_id = ?
    `).all(...photo_ids, req.user.id);

        for (const photo of photos) {
            [photo.original_path, photo.thumbnail_path, photo.watermarked_path].forEach(filePath => {
                if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        db.prepare(`DELETE FROM photos WHERE id IN (${placeholders})`).run(...photo_ids);

        res.json({ message: `${photos.length} photos deleted` });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to delete photos' });
    }
};

// Move photos to folder
export const movePhotos = (req, res) => {
    try {
        const { photo_ids, folder_id } = req.body;

        if (!photo_ids || !Array.isArray(photo_ids)) {
            return res.status(400).json({ error: 'Photo IDs array required' });
        }

        const placeholders = photo_ids.map(() => '?').join(',');
        db.prepare(`UPDATE photos SET folder_id = ? WHERE id IN (${placeholders})`)
            .run(folder_id || null, ...photo_ids);

        res.json({ message: 'Photos moved successfully' });
    } catch (error) {
        console.error('Move photos error:', error);
        res.status(500).json({ error: 'Failed to move photos' });
    }
};

// Update photo tags
export const updatePhotoTags = (req, res) => {
    try {
        const { id } = req.params;
        const { tags } = req.body;

        const photo = db.prepare(`
      SELECT p.id FROM photos p
      JOIN galleries g ON p.gallery_id = g.id
      WHERE p.id = ? AND g.admin_id = ?
    `).get(id, req.user.id);

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        db.prepare('UPDATE photos SET tags = ? WHERE id = ?').run(JSON.stringify(tags), id);

        res.json({ message: 'Tags updated' });
    } catch (error) {
        console.error('Update tags error:', error);
        res.status(500).json({ error: 'Failed to update tags' });
    }
};

// Serve photo file
export const servePhoto = (req, res) => {
    try {
        const { filename, type } = req.params;
        const folder = type === 'thumb' ? 'thumbnails' : type === 'watermarked' ? 'watermarked' : 'originals';
        const filePath = path.join(UPLOAD_DIR, folder, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error('Serve photo error:', error);
        res.status(500).json({ error: 'Failed to serve photo' });
    }
};

// Search photos by natural language (Tamil + English)
export const searchPhotos = (req, res) => {
    try {
        const { gallery_id } = req.params;
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }

        // Tamil to English keyword mapping
        const tamilKeywords = {
            'திருமணம்': 'wedding',
            'கல்யாணம்': 'wedding',
            'குழு': 'group',
            'குடும்பம்': 'family',
            'போர்ட்ரெய்ட்': 'portrait',
            'முகம்': 'portrait',
            'கேண்டிட்': 'candid',
            'இயல்பான': 'candid',
            'மணப்பெண்': 'bride',
            'மணமகன்': 'groom',
            'விழா': 'ceremony',
            'வெளிப்புறம்': 'outdoor',
            'உள்ளகம்': 'indoor'
        };

        let searchQuery = query.toLowerCase();

        // Replace Tamil words with English equivalents
        for (const [tamil, english] of Object.entries(tamilKeywords)) {
            searchQuery = searchQuery.replace(new RegExp(tamil, 'gi'), english);
        }

        const photos = db.prepare(`
      SELECT * FROM photos 
      WHERE gallery_id = ? AND (
        tags LIKE ? OR 
        original_name LIKE ? OR
        face_group LIKE ?
      )
      ORDER BY uploaded_at DESC
    `).all(gallery_id, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);

        res.json({ photos, query: searchQuery });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};
