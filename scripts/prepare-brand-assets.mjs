import { copyFileSync, existsSync, mkdirSync, cpSync } from 'node:fs';

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

if (existsSync('assets/blockchains')) {
  mkdirSync('public/assets/blockchains', { recursive: true });
  cpSync('assets/blockchains', 'public/assets/blockchains', { recursive: true });
  if (existsSync('android/app/src/main/assets/public')) {
    mkdirSync('android/app/src/main/assets/public/assets/blockchains', { recursive: true });
    cpSync('assets/blockchains', 'android/app/src/main/assets/public/assets/blockchains', { recursive: true });
  }
  console.log('Blockchain local logo assets synchronized.');
}

console.log('TokenCare native/PWA shell branding prepared from resources/icon.png; native splash remains resources/splash.png.');
