export interface PrismaClient {
  file: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
}

interface FileRecord {
  id: string;
  name: string;
  size: number;
  contentHash: string;
  userId: string;
  isDeleted: boolean;
}

export interface DuplicateGroup {
  hash: string;
  files: Array<{ id: string; name: string; size: number }>;
}

export interface FindDuplicatesResult {
  groups: DuplicateGroup[];
}

export interface CompareResult {
  similarity: number;
  isLikelyDuplicate: boolean;
}

export class AIDuplicateService {
  constructor(private readonly prisma: PrismaClient) {}

  computeHash(content: Buffer): string {
    const blockCount = 64;
    const blockSize = Math.max(1, Math.floor(content.length / blockCount));
    const blockAverages: number[] = [];

    for (let i = 0; i < blockCount; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, content.length);
      let sum = 0;
      let count = 0;

      for (let j = start; j < end; j++) {
        sum += content[j]!;
        count++;
      }

      blockAverages.push(count > 0 ? sum / count : 0);
    }

    // Compute overall average
    const overallAverage = blockAverages.reduce((acc, val) => acc + val, 0) / blockAverages.length;

    // Create 64-bit hash: each bit is 1 if block average >= overall average, 0 otherwise
    const hashBytes: number[] = [];
    for (let i = 0; i < 8; i++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const idx = i * 8 + bit;
        if (blockAverages[idx]! >= overallAverage) {
          byte |= 1 << (7 - bit);
        }
      }
      hashBytes.push(byte);
    }

    return Buffer.from(hashBytes).toString('hex');
  }

  async findDuplicates(userId: string): Promise<FindDuplicatesResult> {
    const files = await this.prisma.file.findMany({
      where: { userId, isDeleted: false },
    });

    const records = files as unknown as FileRecord[];
    const hashMap = new Map<string, Array<{ id: string; name: string; size: number }>>();

    // Group files by their stored content hash (SHA-256 of plaintext computed at upload)
    for (const record of records) {
      const hash = record.contentHash;
      if (!hashMap.has(hash)) {
        hashMap.set(hash, []);
      }
      hashMap.get(hash)!.push({ id: record.id, name: record.name, size: record.size });
    }

    // Only include groups with more than one file (duplicates)
    const groups: DuplicateGroup[] = [];
    for (const [hash, fileGroup] of hashMap) {
      if (fileGroup.length > 1) {
        groups.push({ hash, files: fileGroup });
      }
    }

    return { groups };
  }

  compareTwoFiles(contentA: Buffer, contentB: Buffer): CompareResult {
    const hashA = this.computeHash(contentA);
    const hashB = this.computeHash(contentB);
    const distance = this.hammingDistance(hashA, hashB);
    // Max distance for 64 bits is 64
    const similarity = 1 - distance / 64;
    const isLikelyDuplicate = distance < 5;

    return { similarity, isLikelyDuplicate };
  }

  private hammingDistance(hashA: string, hashB: string): number {
    const bufA = Buffer.from(hashA, 'hex');
    const bufB = Buffer.from(hashB, 'hex');
    let distance = 0;

    for (let i = 0; i < bufA.length; i++) {
      let xor = (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
      while (xor) {
        distance += xor & 1;
        xor >>= 1;
      }
    }

    return distance;
  }
}
