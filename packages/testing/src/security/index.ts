export type {
  ZAPConfig,
  ZAPScanPolicy,
  ZAPSpiderConfig,
  ZAPAlertThreshold,
  ZAPAuthConfig,
  ZAPAppTarget,
  SnykConfig,
  SnykLicensePolicy,
  SecurityScanResult,
  SecurityFinding,
} from './types';

export { zapConfig, createZapConfig } from './owasp-zap';
export { snykConfig, createSnykConfig } from './snyk';
