import { NextFunction, Request, Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import multer from 'multer';
import BackblazeB2Services from '../services/index';
import { CustomRequest } from 'middleware';

const uploadRouter = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
});

uploadRouter.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).send('No file uploaded');
      return;
    }
    const result = await BackblazeB2Services.uploadFile(file);
    res.status(200).json({
      message: 'File uploaded',
      data: result,
    });
  }),
);

uploadRouter.get(
  '/video-url/:fileId',
  asyncHandler(async (req: CustomRequest, res: Response) => {
    const fileId = req.params.fileId;
    const result = await BackblazeB2Services.getDownloadUrl(
      fileId,
      req.authorizeParams!,
    );
    res.status(200).json({
      message: 'Get download url success',
      data: result,
    });
  }),
);

uploadRouter.post(
  '/upload-large',
  upload.single('file'),
  asyncHandler(async (req: CustomRequest, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).send('No file uploaded');
      return;
    }
    const result = await BackblazeB2Services.uploadChunkedFile(file);
    res.status(200).json({
      message: 'File uploaded',
      data: result,
    });
  }),
);
uploadRouter.post(
  '/upload-large-v2',
  upload.single('file'),
  asyncHandler(async (req: CustomRequest, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).send('No file uploaded');
      return;
    }
    const result = await BackblazeB2Services.uploadChunkedFileV2(file);
    res.status(200).json({
      message: 'File uploaded',
      data: result,
    });
  }),
);

export default uploadRouter;
