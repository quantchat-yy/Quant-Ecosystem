export type OnboardingRole = 'personal' | 'team-admin' | 'creator' | 'advertiser' | 'developer';

export type OnboardingStepStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  required: boolean;
  data?: Record<string, unknown>;
}

export interface OnboardingFlow {
  id: string;
  role: OnboardingRole;
  steps: OnboardingStep[];
  currentStepIndex: number;
  completedAt?: Date;
}

export interface DemoModeConfig {
  enabled: boolean;
  sampleDataSets: SampleDataSet[];
  expiresAt?: Date;
}

export type ImportSource = 'google' | 'microsoft' | 'apple' | 'github' | 'csv' | 'custom';

export type ImportDataType = 'email' | 'calendar' | 'contacts' | 'files' | 'repos';

export interface ImportFlowConfig {
  source: ImportSource;
  dataTypes: ImportDataType[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export type AIPersonality = 'professional' | 'friendly' | 'concise' | 'creative' | 'technical';

export interface AISetupPreferences {
  personality: AIPersonality;
  memoryEnabled: boolean;
  contextSources: string[];
  autoSuggest: boolean;
}

export type PrivacyLevel = 'strict' | 'balanced' | 'open';

export interface PrivacyPreferences {
  level: PrivacyLevel;
  dataSharing: boolean;
  aiDataAccess: boolean;
  profileVisibility: 'public' | 'private' | 'contacts-only';
  activityVisibility: 'public' | 'private' | 'contacts-only';
}

export type NotificationChannel = 'email' | 'push' | 'in-app' | 'sms';

export type NotificationFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';

export interface NotificationPreferences {
  channels: NotificationChannel[];
  frequency: NotificationFrequency;
  categories: Record<string, boolean>;
}

export interface SampleDataSet {
  name: string;
  description: string;
  items: Record<string, unknown>[];
}
