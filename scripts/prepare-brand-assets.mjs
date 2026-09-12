import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

const icon = 'resources/icon.png';
const splash = 'resources/splash.png';
const publicDir = 'public';

if (!existsSync(icon)) {
  console.warn('Notice: resources/icon.png not found, skipping brand asset sync.');
} else {
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(icon, 'public/icon.png');
  console.log('TokenCare native/PWA shell branding prepared from resources/icon.png.');
}

console.log('TokenCare native/PWA shell branding prepared from resources/icon.png; native splash remains resources/splash.png.');
