import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageClient, type StorageConfig } from '@quant/storage';

function getS3Config(): StorageConfig | null {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
  };
}

export class StorageService {
  private s3Client: StorageClient | null = null;
  private uploadDir = path.join(process.cwd(), 'uploads');
  private useS3: boolean;

  constructor() {
    const config = getS3Config();
    if (config) {
      this.s3Client = new StorageClient(config);
      this.useS3 = true;
    } else {
      this.useS3 = false;
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    }
  }

  async uploadFile(file: Buffer, filename: string, contentType: string) {
    const fileId = uuidv4();
    const ext = path.extname(filename);
    const key = `uploads/${fileId}${ext}`;

    if (this.useS3 && this.s3Client) {
      const { etag } = await this.s3Client.upload(key, file, contentType, {
        originalName: filename,
      });

      return {
        fileId,
        key,
        originalName: filename,
        size: file.length,
        contentType,
        etag,
        url: `/files/${fileId}${ext}`,
      };
    }

    // Local filesystem fallback for development
    const storedFilename = `${fileId}${ext}`;
    const filePath = path.join(this.uploadDir, storedFilename);
    fs.writeFileSync(filePath, file);

    return {
      fileId,
      key,
      originalName: filename,
      size: file.length,
      contentType,
      etag: '',
      url: `/files/${storedFilename}`,
    };
  }

  async getFile(key: string) {
    if (this.useS3 && this.s3Client) {
      return this.s3Client.download(key);
    }

    // Local filesystem fallback
    const filename = path.basename(key);
    const filePath = path.join(this.uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const body = fs.createReadStream(filePath);
    return {
      body,
      contentType: 'application/octet-stream',
      contentLength: fs.statSync(filePath).size,
    };
  }

  async deleteFile(key: string) {
    if (this.useS3 && this.s3Client) {
      await this.s3Client.delete(key);
      return true;
    }

    // Local filesystem fallback
    const filename = path.basename(key);
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
    if (this.useS3 && this.s3Client) {
      return this.s3Client.getSignedUrl(key, expiresIn);
    }
    return null;
  }
}
