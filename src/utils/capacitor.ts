import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';

/**
 * Check if the app is currently running inside a native Capacitor shell (Android / iOS).
 */
export const isCapacitorNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get current platform: 'android' | 'ios' | 'web'
 */
export const getMobilePlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Configure native mobile status bar styling
 */
export const initMobileStatusBar = async (isDark = true, color = '#090C13') => {
  if (!isCapacitorNative()) return;
  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({
        color: color,
      });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (err) {
    console.warn('[Capacitor] StatusBar configuration warning:', err);
  }
};

/**
 * Hide mobile splash screen once app hydration completes
 */
export const hideMobileSplashScreen = async () => {
  if (!isCapacitorNative()) return;
  try {
    await SplashScreen.hide();
  } catch (err) {
    console.warn('[Capacitor] SplashScreen hide warning:', err);
  }
};

/**
 * Native Haptic Feedback Helpers
 */
export const triggerHaptic = {
  light: async () => {
    if (!isCapacitorNative()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Ignore if not supported
    }
  },
  medium: async () => {
    if (!isCapacitorNative()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Ignore if not supported
    }
  },
  heavy: async () => {
    if (!isCapacitorNative()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Ignore if not supported
    }
  },
  success: async () => {
    if (!isCapacitorNative()) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Ignore if not supported
    }
  },
  warning: async () => {
    if (!isCapacitorNative()) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      // Ignore if not supported
    }
  },
  error: async () => {
    if (!isCapacitorNative()) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      // Ignore if not supported
    }
  },
  selection: async () => {
    if (!isCapacitorNative()) return;
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch {
      // Ignore if not supported
    }
  },
};

/**
 * Register Android hardware back button handler
 */
export const registerMobileBackButtonListener = (onBack: () => boolean | void) => {
  if (!isCapacitorNative()) return () => {};

  const listenerPromise = CapApp.addListener('backButton', (data) => {
    const handled = onBack();
    if (!handled && data.canGoBack) {
      window.history.back();
    }
  });

  return () => {
    listenerPromise.then((handle) => handle.remove()).catch(() => {});
  };
};
