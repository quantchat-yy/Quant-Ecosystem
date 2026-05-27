// Biometric Auth Service - Face ID, Touch ID, Fingerprint abstraction

export type BiometricType = 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'none';

export interface AuthResult {
  success: boolean;
  error?: string;
  biometricType: BiometricType;
}

export interface BiometricConfig {
  allowFallback: boolean;
  fallbackTitle?: string;
  invalidateOnBiometryChange?: boolean;
}

export class BiometricAuthService {
  private available = true;
  private biometricType: BiometricType = 'faceId';
  private credentials: Map<string, string> = new Map();
  private readonly config: BiometricConfig;

  constructor(config?: Partial<BiometricConfig>) {
    this.config = {
      allowFallback: config?.allowFallback ?? true,
      fallbackTitle: config?.fallbackTitle,
      invalidateOnBiometryChange: config?.invalidateOnBiometryChange ?? false,
    };
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async authenticate(reason: string): Promise<AuthResult> {
    if (!reason) {
      throw new Error('Authentication reason is required');
    }
    if (!this.available) {
      return { success: false, error: 'Biometric not available', biometricType: 'none' };
    }
    return { success: true, biometricType: this.biometricType };
  }

  async getType(): Promise<BiometricType> {
    return this.biometricType;
  }

  async setCredentials(key: string, value: string): Promise<void> {
    if (!this.available) {
      throw new Error('Biometric not available');
    }
    this.credentials.set(key, value);
  }

  async getCredentials(key: string): Promise<string | null> {
    if (!this.available) {
      throw new Error('Biometric not available');
    }
    return this.credentials.get(key) ?? null;
  }

  getConfig(): BiometricConfig {
    return { ...this.config };
  }

  /** @internal - for testing */
  _setAvailable(available: boolean): void {
    this.available = available;
  }

  /** @internal - for testing */
  _setBiometricType(type: BiometricType): void {
    this.biometricType = type;
  }
}
