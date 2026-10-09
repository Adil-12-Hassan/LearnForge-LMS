import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export const CLOUDINARY_FOLDERS = {
    avatars: 'learnforge/avatars',
    thumbnails: 'learnforge/thumbnails',
    videos: 'learnforge/videos',
    pdfs: 'learnforge/pdfs',
    assignments: 'learnforge/assignments',
} as const;