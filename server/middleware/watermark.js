import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const POSITION_MAP = {
    'top-left': { gravity: 'northwest' },
    'top-center': { gravity: 'north' },
    'top-right': { gravity: 'northeast' },
    'center-left': { gravity: 'west' },
    'center': { gravity: 'center' },
    'center-right': { gravity: 'east' },
    'bottom-left': { gravity: 'southwest' },
    'bottom-center': { gravity: 'south' },
    'bottom-right': { gravity: 'southeast' }
};

export const applyWatermark = async (inputPath, outputPath, options = {}) => {
    const {
        text = '',
        logo = '',
        opacity = 0.5,
        font = 'Arial',
        size = 24,
        position = 'bottom-right'
    } = options;

    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();
        const { width, height } = metadata;

        let overlayBuffer;

        if (logo && fs.existsSync(logo)) {
            // Use logo image
            const logoSize = Math.min(width, height) * 0.15;
            overlayBuffer = await sharp(logo)
                .resize(Math.round(logoSize), null, { withoutEnlargement: true })
                .ensureAlpha()
                .modulate({ brightness: 1, saturation: 1 })
                .composite([{
                    input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
                    raw: { width: 1, height: 1, channels: 4 },
                    tile: true,
                    blend: 'dest-in'
                }])
                .toBuffer();
        } else if (text) {
            // Create text watermark using SVG
            const fontSize = size || Math.round(Math.min(width, height) * 0.04);
            const svgText = `
        <svg width="${width}" height="${height}">
          <style>
            .watermark { 
              fill: rgba(255, 255, 255, ${opacity}); 
              font-size: ${fontSize}px; 
              font-family: ${font}, sans-serif;
              font-weight: bold;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            }
          </style>
          <text 
            x="${width / 2}" 
            y="${height / 2}" 
            class="watermark" 
            text-anchor="middle" 
            dominant-baseline="middle"
          >${text}</text>
        </svg>
      `;
            overlayBuffer = Buffer.from(svgText);
        } else {
            // No watermark, just copy
            fs.copyFileSync(inputPath, outputPath);
            return outputPath;
        }

        const positionConfig = POSITION_MAP[position] || POSITION_MAP['bottom-right'];

        await image
            .composite([{
                input: overlayBuffer,
                gravity: positionConfig.gravity,
                blend: 'over'
            }])
            .jpeg({ quality: 90 })
            .toFile(outputPath);

        return outputPath;
    } catch (error) {
        console.error('Watermark error:', error);
        // If watermarking fails, just copy the original
        fs.copyFileSync(inputPath, outputPath);
        return outputPath;
    }
};

// Apply watermark to multiple images
export const bulkApplyWatermark = async (photos, options) => {
    const results = [];

    for (const photo of photos) {
        try {
            await applyWatermark(photo.originalPath, photo.watermarkedPath, options);
            results.push({ id: photo.id, success: true });
        } catch (error) {
            results.push({ id: photo.id, success: false, error: error.message });
        }
    }

    return results;
};

// Regenerate watermarks for a gallery (when settings change)
export const regenerateGalleryWatermarks = async (galleryId, options, db) => {
    const photos = db.prepare(`
    SELECT id, original_path, watermarked_path FROM photos WHERE gallery_id = ?
  `).all(galleryId);

    const results = await bulkApplyWatermark(photos.map(p => ({
        id: p.id,
        originalPath: p.original_path,
        watermarkedPath: p.watermarked_path
    })), options);

    return results;
};
