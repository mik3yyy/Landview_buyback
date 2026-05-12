import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WebP, and PDF files are allowed'));
    }
  },
}).single('file');

export async function uploadReceipt(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'landview/receipts',
          resource_type: req.file!.mimetype === 'application/pdf' ? 'raw' : 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file!.buffer);
    });

    return res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err: any) {
    console.error('[Cloudinary upload error]', err);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}
