// Shared in-memory store for feature flags (demo data)
export const flagsStore: Map<string, Record<string, unknown>> = new Map([
  [
    'flag_demo1',
    {
      id: 'flag_demo1',
      name: 'dark-mode-v2',
      description: 'New dark mode implementation',
      enabled: true,
      rules: [],
      percentage: 100,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'flag_demo2',
    {
      id: 'flag_demo2',
      name: 'ai-chat-beta',
      description: 'AI chat feature beta rollout',
      enabled: true,
      rules: [],
      percentage: 25,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'flag_demo3',
    {
      id: 'flag_demo3',
      name: 'new-onboarding',
      description: 'Redesigned onboarding flow',
      enabled: false,
      rules: [],
      percentage: 50,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
]);
