export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: { url?: string; cleartext?: boolean };
  plugins?: Record<string, unknown>;
}

export const config: CapacitorConfig = {
  appId: 'com.quant.app',
  appName: 'Quant',
  webDir: 'dist',
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: { launchAutoHide: true, launchFadeOutDuration: 300 },
    Keyboard: { resize: 'body', style: 'dark' },
  },
};
