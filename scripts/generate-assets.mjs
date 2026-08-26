import { existsSync, readFileSync, copyFileSync, readdirSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const icon = 'resources/icon.png';
const splash = 'resources/splash.png';

if (!existsSync(icon) || !existsSync(splash)) {
  console.error('Native asset generation aborted: resources/icon.png and resources/splash.png are required.');
  process.exit(1);
}

// The local icon is also the source for the PWA/launcher manifest icon.
// Keep the React application's CDN branding untouched.
copyFileSync(icon, 'public/icon.png');

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  command,
  [
    '@capacitor/assets',
    'generate',
    '--android',
    '--assetPath',
    'resources',
    '--iconBackgroundColor',
    '#030710',
    '--splashBackgroundColor',
    '#030710',
  ],
  { stdio: 'inherit' },
);

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

const nativeResDir = 'android/app/src/main/res';
const nativeSplashDir = `${nativeResDir}/drawable`;
mkdirSync(nativeSplashDir, { recursive: true });

// Remove stale default Android vector foreground in drawable-v24 if present
const v24Foreground = `${nativeResDir}/drawable-v24/ic_launcher_foreground.xml`;
if (existsSync(v24Foreground)) {
  try {
    unlinkSync(v24Foreground);
  } catch (e) {
    console.warn('Could not remove drawable-v24/ic_launcher_foreground.xml', e);
  }
}

// Keep the exact user-supplied native assets at stable Android resource names.
copyFileSync(splash, `${nativeSplashDir}/splash.png`);
copyFileSync(icon, `${nativeSplashDir}/icon.png`);

// Capacitor Assets can regenerate adaptive-icon XML. Replace its foreground with
// the supplied icon, fitted inside Android's adaptive-icon safe area, and keep
// the adaptive background identical to the supplied logo background.
writeFileSync(
  `${nativeSplashDir}/ic_launcher_foreground.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n    <item android:left="16dp" android:top="16dp" android:right="16dp" android:bottom="16dp">\n        <bitmap android:src="@drawable/icon" android:gravity="center" />\n    </item>\n</layer-list>\n`,
);

// Android 12 treats the splash image resource as an icon. Use a valid ScaleDrawable
// so the complete supplied splash artwork is reduced before Android applies its mask.
writeFileSync(
  `${nativeSplashDir}/splash_icon.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<scale xmlns:android="http://schemas.android.com/apk/res/android"\n    android:drawable="@drawable/splash"\n    android:scaleGravity="center"\n    android:scaleWidth="60%"\n    android:scaleHeight="60%" />\n`,
);

const launcherBackground = `${nativeResDir}/values/ic_launcher_background.xml`;
if (existsSync(launcherBackground)) {
  writeFileSync(
    launcherBackground,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#030710</color>\n</resources>\n`,
  );
}

// Never allow a build to silently ship Capacitor/Android's default robot icon.
const adaptiveIconFiles = [
  `${nativeResDir}/mipmap-anydpi-v26/ic_launcher.xml`,
  `${nativeResDir}/mipmap-anydpi-v26/ic_launcher_round.xml`,
];

for (const file of adaptiveIconFiles) {
  if (!existsSync(file)) {
    console.error(`Native branding verification failed: missing ${file}`);
    process.exit(1);
  }

  const content = readFileSync(file, 'utf8');
  if (content.includes('@android:drawable/sym_def_app_icon')) {
    console.error(`Native branding verification failed: ${file} still points to Android's default robot icon.`);
    console.error('The APK build has been stopped instead of shipping the wrong icon.');
    process.exit(1);
  }
}

// Scan all generated Android resource text files for the platform default icon reference.
const scan = (dir) => {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...scan(path));
    else if (/\.(xml|xml\.bak)$/.test(entry.name)) files.push(path);
  }
  return files;
};

for (const file of scan(nativeResDir)) {
  const content = readFileSync(file, 'utf8');
  if (content.includes('sym_def_app_icon')) {
    console.error(`Native branding verification failed: default Android icon reference found in ${file}`);
    process.exit(1);
  }
}

if (!existsSync(`${nativeSplashDir}/splash.png`)) {
  console.error('Native branding verification failed: drawable/splash.png was not created.');
  process.exit(1);
}

if (!existsSync(`${nativeSplashDir}/icon.png`)) {
  console.error('Native branding verification failed: drawable/icon.png was not created.');
  process.exit(1);
}

if (!existsSync(`${nativeSplashDir}/splash_icon.xml`)) {
  console.error('Native branding verification failed: drawable/splash_icon.xml was not created.');
  process.exit(1);
}

console.log('Native TokenCare branding verified: resources/icon.png is the launcher source and resources/splash.png is the native splash source.');
