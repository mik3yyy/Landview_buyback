import { Router } from 'express';
import { uploadMiddleware, uploadReceipt } from '../controllers/upload.controller';

const router = Router();

// Public — clients upload their receipt before submitting application
router.post('/receipt', (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, uploadReceipt as any);

export default router;
