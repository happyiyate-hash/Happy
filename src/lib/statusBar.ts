import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Calculates whether a color (hex, rgb, or css color) is dark or light
 * based on perceived relative luminance.
 */
function isDarkColor(colorStr: string): boolean {
  if (!colorStr) return true;
  const clean = colorStr.trim().toLowerCase();

  if (clean.startsWith('#')) {
    let hex = clean.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.6;
    }
  } else if (clean.startsWith('rgb')) {
    const match = clean.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0], 10);
      const g = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.6;
    }
  }
  return true;
}

/**
 * Normalizes any color string to a valid 6-digit hex string for Android native APIs.
 */
function normalizeToHex(colorStr: string): string {
  if (!colorStr) return '#090C13';
  const clean = colorStr.trim();
  if (clean.startsWith('#')) {
    if (clean.length === 4) {
      return '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
    }
    return clean.slice(0, 7);
  }
  return clean;
}

/**
 * Dynamically updates the native Android/Capacitor status bar and browser (<meta name="theme-color">)
 * so the status bar fills the entire top area, has no border/separator/divider/shadow,
 * and matches the active screen/top-navigation background color with readable icons.
 */
export async function setStatusBarColor(color: string) {
  if (!color) return;
  const hex = normalizeToHex(color);
  const isDark = isDarkColor(hex);

  // 1. Update browser meta tags and DOM background styling
  if (typeof document !== 'undefined') {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', hex);

    document.documentElement.style.backgroundColor = hex;
    document.body.style.backgroundColor = hex;
    document.documentElement.style.setProperty('--status-bar-bg', hex);
  }

  // 2. Update Native Capacitor Android status bar
  if (Capacitor.isNativePlatform()) {
    try {
      // Style.Dark sets light/white system icons for dark backgrounds
      // Style.Light sets dark/black system icons for light backgrounds
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light,
      });

      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({
          color: hex,
        });
        await StatusBar.setOverlaysWebView({ overlay: false });
      }
    } catch {
      // Gracefully ignore if running in unsupported browser/simulator mode
    }
  }
}

/**
 * Custom React hook to set the status bar color for a specific component lifecycle.
 */
export function useStatusBarColor(color: string) {
  useEffect(() => {
    setStatusBarColor(color);
  }, [color]);
}
