// ============================================================================
// Trust & Safety - Content Integrity
// Difference Hash (dHash), Average Hash (aHash), Hamming distance comparison,
// known harmful content matching, near-duplicate detection, manipulation
// detection, watermark embedding, provenance chain
// ============================================================================

import type { PerceptualHash } from '../types';

/** Image data representation (simulated grayscale pixel grid) */
interface ImageData {
  width: number;
  height: number;
  pixels: number[][]; // 2D array of grayscale values (0-255)
}

/** Known harmful content database entry */
interface HarmfulContentEntry {
  id: string;
  dHash: string;
  aHash: string;
  category: string;
  severity: number;
  addedAt: number;
  source: string;
}

/** Near-duplicate detection result */
interface DuplicateResult {
  sourceId: string;
  matchId: string;
  hammingDistance: number;
  similarity: number;
  isDuplicate: boolean;
}

/** Image manipulation indicators */
interface ManipulationIndicators {
  contentId: string;
  metadataConsistent: boolean;
  compressionArtifacts: boolean;
  editingSignatures: string[];
  confidenceScore: number;
  isManipulated: boolean;
}

/** Watermark data for embedding/verification */
interface WatermarkData {
  contentId: string;
  creatorId: string;
  timestamp: number;
  payload: string;
  bits: number[];
}

/** Provenance chain entry */
interface ProvenanceEntry {
  contentId: string;
  action: 'created' | 'modified' | 'shared' | 'verified';
  actorId: string;
  timestamp: number;
  hash: string;
  previousHash: string | null;
  metadata: Record<string, string>;
}

/**
 * ContentIntegrity provides perceptual hashing for image similarity detection,
 * known harmful content matching, near-duplicate detection, manipulation
 * indicator analysis, watermark embedding/verification, and provenance tracking.
 */
export class ContentIntegrity {
  private readonly harmfulDatabase: Map<string, HarmfulContentEntry>;
  private readonly hashes: Map<string, PerceptualHash>;
  private readonly provenanceChains: Map<string, ProvenanceEntry[]>;
  private readonly watermarks: Map<string, WatermarkData>;
  private readonly duplicateThreshold: number;

  constructor(config?: { duplicateThreshold?: number }) {
    this.harmfulDatabase = new Map();
    this.hashes = new Map();
    this.provenanceChains = new Map();
    this.watermarks = new Map();
    this.duplicateThreshold = config?.duplicateThreshold ?? 10; // Hamming distance threshold
  }

  /**
   * Compute Difference Hash (dHash) for an image.
   * Algorithm:
   * 1. Resize to 9x8 (9 columns needed to get 8 differences per row)
   * 2. Compute horizontal gradients (is pixel[col] > pixel[col+1]?)
   * 3. Produce 64-bit hash from the gradient comparisons
   */
  computeDHash(image: ImageData): string {
    // Resize to 9x8 using nearest-neighbor interpolation
    const resized = this.resizeImage(image, 9, 8);

    // Compute horizontal gradients to produce 64 bits
    const bits: number[] = [];
    for (let row = 0; row < 8; row++) {
      const pixelRow = resized.pixels[row];
      if (!pixelRow) continue;
      for (let col = 0; col < 8; col++) {
        const left = pixelRow[col] ?? 0;
        const right = pixelRow[col + 1] ?? 0;
        bits.push(left > right ? 1 : 0);
      }
    }

    return this.bitsToHex(bits);
  }

  /**
   * Compute Average Hash (aHash) for an image.
   * Algorithm:
   * 1. Resize to 8x8
   * 2. Compute mean of all pixel values
   * 3. Each bit: 1 if pixel > mean, 0 otherwise
   */
  computeAHash(image: ImageData): string {
    // Resize to 8x8
    const resized = this.resizeImage(image, 8, 8);

    // Compute mean
    let sum = 0;
    for (let row = 0; row < 8; row++) {
      const pixelRow = resized.pixels[row];
      if (!pixelRow) continue;
      for (let col = 0; col < 8; col++) {
        sum += pixelRow[col] ?? 0;
      }
    }
    const mean = sum / 64;

    // Threshold against mean
    const bits: number[] = [];
    for (let row = 0; row < 8; row++) {
      const pixelRow = resized.pixels[row];
      if (!pixelRow) continue;
      for (let col = 0; col < 8; col++) {
        bits.push((pixelRow[col] ?? 0) > mean ? 1 : 0);
      }
    }

    return this.bitsToHex(bits);
  }

  /**
   * Compute both hashes for a content item
   */
  computeHashes(contentId: string, image: ImageData): PerceptualHash {
    const dHash = this.computeDHash(image);
    const aHash = this.computeAHash(image);

    const result: PerceptualHash = {
      contentId,
      dHash,
      aHash,
      hashBits: 64,
      computedAt: Date.now(),
    };

    this.hashes.set(contentId, result);
    return result;
  }

  /**
   * Calculate Hamming distance between two hex hashes.
   * Uses XOR to find differing bits, then popcount.
   */
  hammingDistance(hash1: string, hash2: string): number {
    const bits1 = this.hexToBits(hash1);
    const bits2 = this.hexToBits(hash2);

    const length = Math.min(bits1.length, bits2.length);
    let distance = 0;

    for (let i = 0; i < length; i++) {
      if (bits1[i] !== bits2[i]) {
        distance++;
      }
    }

    // Account for length difference
    distance += Math.abs(bits1.length - bits2.length);

    return distance;
  }

  /**
   * Calculate similarity percentage from Hamming distance
   */
  calculateSimilarity(hash1: string, hash2: string): number {
    const distance = this.hammingDistance(hash1, hash2);
    const maxBits = 64;
    return 1 - distance / maxBits;
  }

  /**
   * Add an entry to the known harmful content database
   */
  addHarmfulContent(
    id: string,
    dHash: string,
    aHash: string,
    category: string,
    severity: number,
    source: string,
  ): void {
    this.harmfulDatabase.set(id, {
      id,
      dHash,
      aHash,
      category,
      severity: Math.max(0, Math.min(1, severity)),
      addedAt: Date.now(),
      source,
    });
  }

  /**
   * Check if an image matches known harmful content.
   * Returns matching entries where hamming_distance < threshold.
   */
  checkAgainstHarmfulDatabase(
    image: ImageData,
  ): Array<{ entry: HarmfulContentEntry; distance: number; similarity: number }> {
    const dHash = this.computeDHash(image);
    const matches: Array<{ entry: HarmfulContentEntry; distance: number; similarity: number }> = [];

    for (const entry of this.harmfulDatabase.values()) {
      const distance = this.hammingDistance(dHash, entry.dHash);
      if (distance < this.duplicateThreshold) {
        matches.push({
          entry,
          distance,
          similarity: 1 - distance / 64,
        });
      }
    }

    matches.sort((a, b) => a.distance - b.distance);
    return matches;
  }

  /**
   * Detect near-duplicate images in the stored hash database
   */
  detectNearDuplicates(contentId: string): DuplicateResult[] {
    const sourceHash = this.hashes.get(contentId);
    if (!sourceHash) return [];

    const results: DuplicateResult[] = [];

    for (const [id, hash] of this.hashes) {
      if (id === contentId) continue;

      const distance = this.hammingDistance(sourceHash.dHash, hash.dHash);
      const similarity = 1 - distance / 64;
      const isDuplicate = distance < this.duplicateThreshold;

      if (isDuplicate) {
        results.push({
          sourceId: contentId,
          matchId: id,
          hammingDistance: distance,
          similarity,
          isDuplicate,
        });
      }
    }

    results.sort((a, b) => a.hammingDistance - b.hammingDistance);
    return results;
  }

  /**
   * Analyze image metadata for manipulation indicators.
   * Checks EXIF consistency, compression artifacts, and editing signatures.
   */
  detectManipulation(
    contentId: string,
    metadata: {
      software?: string;
      createDate?: number;
      modifyDate?: number;
      compressionQuality?: number;
      hasExif?: boolean;
      dimensions?: { width: number; height: number };
      fileSize?: number;
    },
  ): ManipulationIndicators {
    const signatures: string[] = [];
    let manipulationScore = 0;

    // Check date consistency
    const metadataConsistent =
      !metadata.createDate || !metadata.modifyDate || metadata.modifyDate >= metadata.createDate;

    if (!metadataConsistent) {
      signatures.push('date_inconsistency');
      manipulationScore += 0.3;
    }

    // Check for editing software signatures
    const editingSoftware = ['photoshop', 'gimp', 'lightroom', 'affinity'];
    if (metadata.software) {
      const sw = metadata.software.toLowerCase();
      if (editingSoftware.some((e) => sw.includes(e))) {
        signatures.push(`editing_software:${metadata.software}`);
        manipulationScore += 0.2;
      }
    }

    // Compression artifact analysis
    let compressionArtifacts = false;
    if (metadata.compressionQuality !== undefined) {
      // Very low quality suggests re-compression (quality degradation)
      if (metadata.compressionQuality < 50) {
        compressionArtifacts = true;
        signatures.push('low_compression_quality');
        manipulationScore += 0.15;
      }
      // Very high quality with small file size is suspicious
      if (
        metadata.compressionQuality > 95 &&
        metadata.fileSize &&
        metadata.dimensions &&
        metadata.fileSize < metadata.dimensions.width * metadata.dimensions.height * 0.1
      ) {
        compressionArtifacts = true;
        signatures.push('suspicious_size_ratio');
        manipulationScore += 0.2;
      }
    }

    // Missing EXIF on photos that should have it
    if (metadata.hasExif === false && metadata.dimensions) {
      if (metadata.dimensions.width > 1000 || metadata.dimensions.height > 1000) {
        signatures.push('missing_exif_large_image');
        manipulationScore += 0.15;
      }
    }

    return {
      contentId,
      metadataConsistent,
      compressionArtifacts,
      editingSignatures: signatures,
      confidenceScore: Math.min(1, manipulationScore),
      isManipulated: manipulationScore >= 0.5,
    };
  }

  /**
   * Embed a watermark using LSB (Least Significant Bit) steganography simulation.
   * Encodes payload into the least significant bits of pixel values.
   */
  embedWatermark(
    contentId: string,
    creatorId: string,
    image: ImageData,
    payload: string,
  ): { watermarkedImage: ImageData; watermark: WatermarkData } {
    // Convert payload to bits
    const bits: number[] = [];
    for (let i = 0; i < payload.length; i++) {
      const charCode = payload.charCodeAt(i);
      for (let bit = 7; bit >= 0; bit--) {
        bits.push((charCode >> bit) & 1);
      }
    }

    // Add length prefix (16 bits for payload length)
    const lengthBits: number[] = [];
    for (let bit = 15; bit >= 0; bit--) {
      lengthBits.push((payload.length >> bit) & 1);
    }
    const allBits = [...lengthBits, ...bits];

    // Embed into LSB of pixel values
    const watermarkedPixels = image.pixels.map((row) => [...row]);
    let bitIndex = 0;

    for (let row = 0; row < image.height && bitIndex < allBits.length; row++) {
      const pixelRow = watermarkedPixels[row];
      if (!pixelRow) continue;
      for (let col = 0; col < image.width && bitIndex < allBits.length; col++) {
        const currentBit = allBits[bitIndex];
        const currentPixel = pixelRow[col];
        if (currentBit !== undefined && currentPixel !== undefined) {
          pixelRow[col] = (currentPixel & 0xfe) | currentBit;
        }
        bitIndex++;
      }
    }

    const watermark: WatermarkData = {
      contentId,
      creatorId,
      timestamp: Date.now(),
      payload,
      bits: allBits,
    };

    this.watermarks.set(contentId, watermark);

    return {
      watermarkedImage: { width: image.width, height: image.height, pixels: watermarkedPixels },
      watermark,
    };
  }

  /**
   * Extract and verify a watermark from an image
   */
  extractWatermark(image: ImageData): { payload: string; valid: boolean } | null {
    if (image.height < 1 || image.width < 16) return null;

    // Extract length prefix (first 16 bits from LSBs)
    const lengthBits: number[] = [];
    let pixelIdx = 0;

    for (let i = 0; i < 16; i++) {
      const row = Math.floor(pixelIdx / image.width);
      const col = pixelIdx % image.width;
      if (row >= image.height) return null;
      const pixelRow = image.pixels[row];
      if (!pixelRow) return null;
      const pixelVal = pixelRow[col];
      if (pixelVal === undefined) return null;
      lengthBits.push(pixelVal & 1);
      pixelIdx++;
    }

    let payloadLength = 0;
    for (let i = 0; i < 16; i++) {
      const bit = lengthBits[i];
      if (bit === undefined) return null;
      payloadLength = (payloadLength << 1) | bit;
    }

    if (payloadLength <= 0 || payloadLength > 1000) return null;

    // Extract payload bits
    const payloadBits: number[] = [];
    const totalBits = payloadLength * 8;

    for (let i = 0; i < totalBits; i++) {
      const row = Math.floor(pixelIdx / image.width);
      const col = pixelIdx % image.width;
      if (row >= image.height) return null;
      const pixelRow = image.pixels[row];
      if (!pixelRow) return null;
      const pixelVal = pixelRow[col];
      if (pixelVal === undefined) return null;
      payloadBits.push(pixelVal & 1);
      pixelIdx++;
    }

    // Convert bits to string
    let payload = '';
    for (let i = 0; i < payloadBits.length; i += 8) {
      let charCode = 0;
      for (let bit = 0; bit < 8; bit++) {
        charCode = (charCode << 1) | (payloadBits[i + bit] ?? 0);
      }
      payload += String.fromCharCode(charCode);
    }

    return { payload, valid: payload.length === payloadLength };
  }

  /**
   * Add a provenance entry to a content's chain
   */
  addProvenanceEntry(
    contentId: string,
    action: ProvenanceEntry['action'],
    actorId: string,
    metadata: Record<string, string> = {},
  ): ProvenanceEntry {
    const chain = this.provenanceChains.get(contentId) ?? [];
    const lastEntry = chain.length > 0 ? chain[chain.length - 1] : undefined;
    const previousHash = lastEntry ? lastEntry.hash : null;

    // Create a hash of the entry (simulated with string hash)
    const hashInput = `${contentId}:${action}:${actorId}:${Date.now()}:${previousHash ?? 'genesis'}`;
    const hash = this.simpleHash(hashInput);

    const entry: ProvenanceEntry = {
      contentId,
      action,
      actorId,
      timestamp: Date.now(),
      hash,
      previousHash,
      metadata,
    };

    chain.push(entry);
    this.provenanceChains.set(contentId, chain);
    return entry;
  }

  /**
   * Verify provenance chain integrity
   */
  verifyProvenanceChain(contentId: string): { valid: boolean; brokenAt: number | null } {
    const chain = this.provenanceChains.get(contentId);
    if (!chain || chain.length === 0) return { valid: true, brokenAt: null };

    // First entry should have null previousHash
    const firstEntry = chain[0];
    if (!firstEntry || firstEntry.previousHash !== null) {
      return { valid: false, brokenAt: 0 };
    }

    // Each entry's previousHash should match the prior entry's hash
    for (let i = 1; i < chain.length; i++) {
      const current = chain[i];
      const previous = chain[i - 1];
      if (!current || !previous || current.previousHash !== previous.hash) {
        return { valid: false, brokenAt: i };
      }
    }

    return { valid: true, brokenAt: null };
  }

  /**
   * Get provenance chain for a content item
   */
  getProvenanceChain(contentId: string): ProvenanceEntry[] {
    return this.provenanceChains.get(contentId) ?? [];
  }

  /**
   * Resize image using nearest-neighbor interpolation
   */
  private resizeImage(image: ImageData, targetWidth: number, targetHeight: number): ImageData {
    const pixels: number[][] = [];
    const xRatio = image.width / targetWidth;
    const yRatio = image.height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.min(Math.floor(x * xRatio), image.width - 1);
        const srcY = Math.min(Math.floor(y * yRatio), image.height - 1);
        const srcRow = image.pixels[srcY];
        row.push(srcRow?.[srcX] ?? 0);
      }
      pixels.push(row);
    }

    return { width: targetWidth, height: targetHeight, pixels };
  }

  /**
   * Convert bit array to hex string
   */
  private bitsToHex(bits: number[]): string {
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      let nibble = 0;
      for (let j = 0; j < 4 && i + j < bits.length; j++) {
        nibble = (nibble << 1) | (bits[i + j] ?? 0);
      }
      hex += nibble.toString(16);
    }
    return hex;
  }

  /**
   * Convert hex string to bit array
   */
  private hexToBits(hex: string): number[] {
    const bits: number[] = [];
    for (const char of hex) {
      const nibble = parseInt(char, 16);
      for (let bit = 3; bit >= 0; bit--) {
        bits.push((nibble >> bit) & 1);
      }
    }
    return bits;
  }

  /**
   * Simple hash function for provenance chain (simulated)
   */
  private simpleHash(input: string): string {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193); // FNV prime
      hash = hash >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Get hash database size
   */
  getHashCount(): number {
    return this.hashes.size;
  }

  /**
   * Get harmful content database size
   */
  getHarmfulDatabaseSize(): number {
    return this.harmfulDatabase.size;
  }
}
