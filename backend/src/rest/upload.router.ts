import express, { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'document',
  'text/plain': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

const uploadRouter: Router = express.Router();

uploadRouter.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  const mediaType = ALLOWED_MIME[req.file.mimetype] ?? 'document';
  const url = `${env.BACKEND_URL ?? `http://localhost:${env.PORT}`}/uploads/${req.file.filename}`;

  res.json({
    url,
    mediaType,
    filename: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
});

export { uploadRouter };
