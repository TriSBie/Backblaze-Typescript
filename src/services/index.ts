import { IAuthorizeParams } from 'middleware';
import { B2_BUCKET_ID, B2_BUCKET_NAME } from '../configKey';
import { blackblaze } from '../dbconfig';
import fs, { ReadStream } from 'fs';
import Bluebird from 'bluebird';
import axios from 'axios';
import crypto from 'crypto';

const CHUNKED_SIZE = 10 * 1024 * 1024;

class BackblazeB2Services {
  static async uploadFile(file: Express.Multer.File) {
    await blackblaze.authorize();

    const fileName = file.originalname;
    const fileBuffer = fs.readFileSync(file.path);
    const { data } = await blackblaze.getUploadUrl({
      bucketId: B2_BUCKET_ID || '',
    });
    const { uploadUrl, authorizationToken } = data;
    const uploadResponse = await blackblaze.uploadFile({
      fileName,
      data: fileBuffer,
      uploadAuthToken: authorizationToken,
      uploadUrl,
    });
    if (uploadResponse.status !== 200) {
      throw new Error('Upload file failed');
    }
    // unlink file after upload
    fs.unlinkSync(file.path);
    return {
      status_upload: uploadResponse.status,
      data: uploadResponse.data,
    };
  }
  static async getDownloadUrl(
    fileId: string,
    authorizeParams: IAuthorizeParams,
  ) {
    // get file info
    const result = await blackblaze.getFileInfo({
      fileId,
    });

    const bucketName = B2_BUCKET_NAME || '';
    const { contentLength, bucketId, fileName } = result.data;
    const { downloadUrl } = authorizeParams;
    const completedUrl = `${downloadUrl}/file/${bucketName}/${fileName}`;
    return {
      downloadUrl: completedUrl,
      contentLength,
    };
  }

  static async uploadChunkedFile(file: Express.Multer.File) {
    const fileName = file.originalname;
    const fileSize = fs.statSync(file.path).size;
    const filePath = file.path;
    const bucketId = B2_BUCKET_ID || '';

    // Start Large File
    const startResponse = await blackblaze.startLargeFile({
      bucketId,
      fileName,
    });

    const { fileId } = startResponse.data;

    const fileStream = fs.createReadStream(filePath, {
      highWaterMark: CHUNKED_SIZE,
    });
    const parts = [];
    let partNumber = 1;

    for await (const chunk of fileStream) {
      // get the uploadPartUrl
      const uploadUrlResponse = await blackblaze.getUploadPartUrl({
        fileId,
      });

      const { uploadUrl, authorizationToken } = uploadUrlResponse.data;
      const uploadResponse = await blackblaze.uploadPart({
        partNumber,
        uploadUrl,
        uploadAuthToken: authorizationToken,
        data: chunk,
      });

      parts.push({
        partNumber,
        data: uploadResponse.data,
      });
      partNumber += 1;
    }

    // Finish Large File
    const finishResponse = await blackblaze.finishLargeFile({
      fileId,
      partSha1Array: parts.map((part) => part.data.contentSha1),
    });

    if (finishResponse.status !== 200) {
      throw new Error('Upload file failed');
    } else {
      fs.unlinkSync(filePath);
    }
    // unlink file after upload
    return {
      status_upload: finishResponse.status,
      data: finishResponse.data,
    };
  }

  static async uploadChunkedFileV2(file: Express.Multer.File) {
    const fileName = file.originalname;
    const fileSize = fs.statSync(file.path).size;
    const filePath = file.path;
    const bucketId = B2_BUCKET_ID || '';

    const totalParts = Math.ceil(fileSize / CHUNKED_SIZE);
    console.log(
      `Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB) in ${totalParts} parts.`,
    );

    // Start Large File
    const startResponse = await blackblaze.startLargeFile({
      bucketId,
      fileName,
    });

    const { fileId } = startResponse.data;

    const fileStream: ReadStream = fs.createReadStream(filePath, {
      highWaterMark: CHUNKED_SIZE,
    });
    const chunks = [];
    let partNumber = 1;

    // Read file into chunks
    for await (const chunk of fileStream) {
      chunks.push({
        partNumber,
        chunk,
        sha1: calculateSha1(chunk),
      });
      partNumber++;
    }

    // Upload chunks in parallel with progress tracking

    // Finish Large File
    let uploadedSize = 0;
    const uploadResponses = await Bluebird.map(
      chunks,
      async ({ partNumber, chunk, sha1 }) => {
        let attempt = 0;
        const maxRetries = 3;

        while (attempt < maxRetries) {
          try {
            const uploadUrlResponse = await blackblaze.getUploadPartUrl({
              fileId,
            });
            const { uploadUrl, authorizationToken } = uploadUrlResponse.data;

            const response = await axios.post(uploadUrl, chunk, {
              headers: {
                Authorization: authorizationToken,
                'X-Bz-Part-Number': partNumber,
                'X-Bz-Content-Sha1': sha1,
                'Content-Length': chunk.length,
              },
            });

            uploadedSize += chunk.length;
            console.log(
              `Part ${partNumber}/${totalParts} uploaded. Progress: ${((uploadedSize / fileSize) * 100).toFixed(2)}%`,
            );

            return { partNumber, contentSha1: sha1 };
          } catch (error: any) {
            console.error(
              `Error uploading part ${partNumber}, attempt ${attempt + 1}:`,
              error.response ? error.response.data : error.message,
            );
            attempt++;
            if (attempt >= maxRetries) {
              throw new Error(
                `Failed to upload part ${partNumber} after ${maxRetries} attempts.`,
              );
            }
          }
        }
      },
      { concurrency: 5 },
    ); // Adjust concurrency as needed

    // Finish Large File
    const finishResponse = await blackblaze.finishLargeFile({
      fileId,
      partSha1Array: uploadResponses.map((p: any) => p.contentSha1),
    });

    if (finishResponse.status !== 200) {
      throw new Error('Upload file failed');
    } else {
      fs.unlinkSync(filePath);
    }
    // unlink file after upload
    return {
      status_upload: finishResponse.status,
      data: finishResponse.data,
    };
  }
}

// Helper function to calculate SHA-1 hash
function calculateSha1(data: any) {
  return crypto.createHash('sha1').update(data).digest('hex');
}

export default BackblazeB2Services;
