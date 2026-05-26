export interface ZAPConfig {
  target: string;
  apiKey?: string;
  scanPolicies: ZAPScanPolicy[];
  spiderConfig: ZAPSpiderConfig;
  alertThresholds: ZAPAlertThreshold;
  authentication?: ZAPAuthConfig;
  contextName: string;
  apps: ZAPAppTarget[];
}

export interface ZAPScanPolicy {
  name: string;
  enabled: boolean;
  strength: 'low' | 'medium' | 'high' | 'insane';
  threshold: 'off' | 'low' | 'medium' | 'high';
}

export interface ZAPSpiderConfig {
  maxDepth: number;
  maxChildren: number;
  recurse: boolean;
  handleODataParametersVisited: boolean;
}

export interface ZAPAlertThreshold {
  maxHigh: number;
  maxMedium: number;
  maxLow: number;
  failOnHigh: boolean;
}

export interface ZAPAuthConfig {
  method: 'form' | 'json' | 'header';
  loginUrl: string;
  credentials: { username: string; password: string };
  tokenExtraction?: string;
}

export interface ZAPAppTarget {
  name: string;
  baseUrl: string;
  includePaths: string[];
  excludePaths: string[];
}

export interface SnykConfig {
  organization: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  failOn: 'all' | 'upgradable' | 'patchable';
  packageManifests: string[];
  ignorePatterns: string[];
  licenseCompliance: SnykLicensePolicy;
  autoFix: boolean;
  monitorOnPush: boolean;
}

export interface SnykLicensePolicy {
  allowedLicenses: string[];
  deniedLicenses: string[];
  warnLicenses: string[];
}

export interface SecurityScanResult {
  tool: string;
  timestamp: number;
  pass: boolean;
  findings: SecurityFinding[];
  summary: { high: number; medium: number; low: number; info: number };
}

export interface SecurityFinding {
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location?: string;
  cwe?: string;
  remediation?: string;
}
