import { blackblaze } from '../dbconfig';
import { NextFunction, Request, Response } from 'express';

export interface CustomRequest extends Request {
  authorizeParams?: IAuthorizeParams;
}

export interface IAuthorizeParams {
  accountId: string;
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  recommendedPartSize: number;
  absoluteMinimumPartSize: number;
  allowed: {
    bucketId: string;
    bucketName: string;
    capabilities: string[];
    namePrefix: string;
  }[];
}
const backblazeMiddleware = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authorizeParamsRe = await blackblaze.authorize(); // must authorize first (authorization lasts 24 hrs)
    // set authorizeParamsRe to throughout the request object
    console.log('Authorize to Blackkblaze success');
    req.authorizeParams = authorizeParamsRe.data;
    next();
  } catch (error) {
    res.status(500).send('Error authorizing with Backblaze');
  }
};

export { backblazeMiddleware };
