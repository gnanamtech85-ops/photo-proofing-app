import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';
import fs from 'fs';

const isCloudinary = !!process.env.CLOUDINARY_URL;

let storage;

if (isCloudinary) {
    console.log('Using Cloudinary storage');
    cloudinary.config({
        secure: true
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'photo-proofing',
            allowed_formats: ['jpg', 'png', 'gif', 'webp'],
            // public_id: (req, file) => file.originalname.split('.')[0] // Use original name or uuid
        }
    });
} else {
    console.log('Using Local storage');
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

    // Ensure directories exist
    ['originals', 'thumbnails', 'watermarked'].forEach(dir => {
        const dirPath = path.join(UPLOAD_DIR, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            // Temporarily upload to originals, controller will handle processing
            cb(null, path.join(UPLOAD_DIR, 'originals'));
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
}

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50000000 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        }
    }
});

export default upload;
export { isCloudinary, cloudinary };
