import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware';
import { extractInvestmentDataFromDocument } from '../services/aiDocument.service';
import { createAuditLog } from '../utils/auditLogger';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, PNG, and JPG files are allowed'));
    }
  },
});

export async function processAIUpload(req: AuthRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const extracted = await extractInvestmentDataFromDocument(req.file.path, req.file.mimetype);

    await createAuditLog({
      userId: req.user!.id,
      actionType: 'AI_UPLOAD',
      entityType: 'investment',
      description: `AI document uploaded: ${req.file.originalname}`,
      newValues: { filename: req.file.originalname, extractedFields: Object.keys(extracted).filter(k => k !== 'confidence') },
      req,
    });

    return res.json({
      extracted_data: extracted,
      document_url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
    });
  } catch (error: any) {
    // Clean up file on error
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: error.message || 'AI extraction failed' });
  }
}
