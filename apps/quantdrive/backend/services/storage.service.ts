import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Buffer, filename: string, contentType: string) {
    const fileId = uuidv4();
    const ext = path.extname(filename);
    const storedFilename = `${fileId}${ext}`;
    const filePath = path.join(this.uploadDir, storedFilename);

    fs.writeFileSync(filePath, file);

    return {
      fileId,
      filename: storedFilename,
      originalName: filename,
      size: file.length,
      contentType,
      url: `/files/${storedFilename}`,
    };
  }

  async getFile(fileId: string) {
    // TODO: Implement retrieval from DB + storage
    return null;
  }

  async deleteFile(fileId: string) {
    // TODO: Implement deletion
    return true;
  }
}
