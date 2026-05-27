export type {
  OnboardingRole,
  OnboardingStepStatus,
  OnboardingStep,
  OnboardingFlow,
  DemoModeConfig,
  ImportSource,
  ImportDataType,
  ImportFlowConfig,
  AIPersonality,
  AISetupPreferences,
  PrivacyLevel,
  PrivacyPreferences,
  NotificationChannel,
  NotificationFrequency,
  NotificationPreferences,
  SampleDataSet,
} from './types.js';

export {
  createAccountOnboardingFlow,
  advanceAccountFlow,
  completeAccountStep,
  skipOptionalStep as skipAccountOptionalStep,
} from './flows/account-onboarding.js';

export {
  createWorkspaceOnboardingFlow,
  advanceWorkspaceFlow,
  completeWorkspaceStep,
  skipOptionalStep as skipWorkspaceOptionalStep,
} from './flows/workspace-onboarding.js';

export { createRoleOnboardingFlow } from './flows/role-onboarding.js';

export { createDemoMode, generateSampleData, getSampleDataSets } from './demo-mode.js';

export {
  createImportFlow,
  getAvailableImportSources,
  validateImportConfig,
} from './import-flows.js';

export { createAISetup, getPersonalityOptions, validateAISetup } from './ai-setup.js';

export { createPrivacySetup, getPrivacyPresets, validatePrivacySetup } from './privacy-setup.js';

export {
  createNotificationSetup,
  getDefaultNotificationCategories,
  validateNotificationSetup,
} from './notification-setup.js';
