import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import db from '../models/database.js';

export const createZipDownload = async (res, photos, customFilename = 'photos') => {
    const archive = archiver('zip', { zlib: { level: 6 } });

    // Set headers for download
    const filename = `${customFilename.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe archive to response
    archive.pipe(res);

    // Add photos to archive
    for (const photo of photos) {
        if (fs.existsSync(photo.original_path)) {
            archive.file(photo.original_path, { name: photo.original_name });
        }
    }

    // Finalize archive
    await archive.finalize();
};

// Generate ZIP for approved selections
export const createSelectionsZip = async (res, galleryId, clientIdentifier, customFilename) => {
    const selections = db.prepare(`
    SELECT p.* FROM photos p
    JOIN selections s ON p.id = s.photo_id
    WHERE s.gallery_id = ? AND s.client_identifier = ? AND s.status = 'approved'
  `).all(galleryId, clientIdentifier);

    if (selections.length === 0) {
        throw new Error('No approved photos to download');
    }

    await createZipDownload(res, selections, customFilename);
};

// Generate ZIP for entire gallery (admin)
export const createGalleryZip = async (res, galleryId, customFilename) => {
    const photos = db.prepare('SELECT * FROM photos WHERE gallery_id = ?').all(galleryId);

    if (photos.length === 0) {
        throw new Error('No photos in gallery');
    }

    await createZipDownload(res, photos, customFilename);
};
