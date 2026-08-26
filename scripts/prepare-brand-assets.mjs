import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

const icon = 'resources/icon.png';
const publicDir = 'public';

try {
  mkdirSync(publicDir, { recursive: true });

  if (existsSync(icon)) {
    copyFileSync(icon, 'public/icon.png');
    console.log('Brand asset copied: resources/icon.png -> public/icon.png');
  } else {
    console.log('Notice: resources/icon.png not found, skipping brand asset sync.');
  }
} catch (err) {
  console.warn('Warning during brand asset preparation:', err);
}
