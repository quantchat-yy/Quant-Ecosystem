// Splash Screen & App Icon Configuration

export interface SplashConfig {
  backgroundColor: string;
  logoUrl: string;
  fadeOutDuration: number;
  autoHide: boolean;
  showSpinner: boolean;
}

export interface IOSIconConfig {
  sizes: number[];
  baseIcon: string;
}

export interface AndroidAdaptiveIcon {
  foreground: string;
  background: string;
  monochrome?: string;
}

export interface AppIconSet {
  ios: IOSIconConfig;
  android: AndroidAdaptiveIcon;
}

export const DEFAULT_SPLASH_CONFIG: SplashConfig = {
  backgroundColor: '#1a1a2e',
  logoUrl: 'assets/splash-logo.svg',
  fadeOutDuration: 300,
  autoHide: true,
  showSpinner: false,
};

export const DEFAULT_ICON_CONFIG: AppIconSet = {
  ios: {
    sizes: [20, 29, 40, 60, 76, 83.5, 1024],
    baseIcon: 'assets/app-icon-ios.png',
  },
  android: {
    foreground: 'assets/ic_launcher_foreground.xml',
    background: 'assets/ic_launcher_background.xml',
    monochrome: 'assets/ic_launcher_monochrome.xml',
  },
};
