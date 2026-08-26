export interface DeviceAndNetworkInfo {
  browser: string;
  os: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  deviceName: string;
  platform: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  locationString: string;
  userAgent: string;
}

// Memory cache for IP info to avoid repeated network calls in same session
let cachedIpInfo: {
  ip: string;
  city: string;
  region: string;
  country: string;
  locationString: string;
} | null = null;

export function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent;

  if (/chrome|crios|crmo/i.test(ua) && !/edg|opr|opera|brave|samsung/i.test(ua)) {
    const match = ua.match(/(?:chrome|crios|crmo)\/([\d.]+)/i);
    return `Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/safari/i.test(ua) && !/chrome|crios|crmo|android|edg|opr/i.test(ua)) {
    const match = ua.match(/version\/([\d.]+)/i);
    return `Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/firefox|fxios/i.test(ua)) {
    const match = ua.match(/(?:firefox|fxios)\/([\d.]+)/i);
    return `Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/edg|edga|edgios/i.test(ua)) {
    const match = ua.match(/edg(?:e|a|ios)?\/([\d.]+)/i);
    return `Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/opr|opera/i.test(ua)) {
    return 'Opera';
  }
  if (/samsungbrowser/i.test(ua)) {
    return 'Samsung Internet';
  }
  return 'Web Browser';
}

export function detectOS(): string {
  if (typeof navigator === 'undefined') return 'Unknown OS';
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';

  if (/android/i.test(ua)) {
    const match = ua.match(/android\s+([\d.]+)/i);
    return `Android ${match ? match[1] : ''}`.trim();
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os\s+([\d_]+)/i);
    const version = match ? match[1].replace(/_/g, '.') : '';
    return /ipad/i.test(ua) ? `iPadOS ${version}`.trim() : `iOS ${version}`.trim();
  }
  if (/mac/i.test(platform) || /macintosh|mac os x/i.test(ua)) {
    return 'macOS';
  }
  if (/win/i.test(platform) || /windows/i.test(ua)) {
    return 'Windows';
  }
  if (/linux/i.test(platform) || /linux/i.test(ua)) {
    return 'Linux';
  }
  if (/cros/i.test(ua)) {
    return 'ChromeOS';
  }
  return 'Desktop OS';
}

export function detectDeviceType(): 'Mobile' | 'Tablet' | 'Desktop' {
  if (typeof navigator === 'undefined') return 'Desktop';
  const ua = navigator.userAgent;
  if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'Tablet';
  }
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    return 'Mobile';
  }
  if (/tablet|android(?!.*mobile)/i.test(ua)) {
    return 'Tablet';
  }
  return 'Desktop';
}

export async function fetchUserIpAndLocation(): Promise<{
  ip: string;
  city: string;
  region: string;
  country: string;
  locationString: string;
}> {
  if (cachedIpInfo) return cachedIpInfo;

  const defaultResult = {
    ip: '127.0.0.1',
    city: 'Local',
    region: 'Network',
    country: 'Session',
    locationString: 'Local Device Session',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        const city = data.city || '';
        const country = data.country_name || data.country || '';
        const region = data.region || '';
        const locationString = [city, country].filter(Boolean).join(', ') || 'Online Region';

        cachedIpInfo = {
          ip: data.ip,
          city: city || 'Online',
          region: region || 'Network',
          country: country || 'Global',
          locationString,
        };
        return cachedIpInfo;
      }
    }
  } catch (err) {
    // Ignore fetch failure
  }

  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 2000);

    const res2 = await fetch('https://api.ipify.org?format=json', {
      signal: controller2.signal,
    }).catch(() => null);

    clearTimeout(timeoutId2);

    if (res2 && res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.ip) {
        cachedIpInfo = {
          ip: data2.ip,
          city: 'Detected',
          region: 'Online',
          country: 'Region',
          locationString: `IP: ${data2.ip}`,
        };
        return cachedIpInfo;
      }
    }
  } catch {}

  return defaultResult;
}

export async function getDetailedDeviceAndNetworkInfo(): Promise<DeviceAndNetworkInfo> {
  const browser = detectBrowser();
  const os = detectOS();
  const deviceType = detectDeviceType();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = detectOS();
  const deviceName = `${browser} on ${os}`;

  const networkInfo = await fetchUserIpAndLocation();

  return {
    browser,
    os,
    deviceType,
    deviceName,
    platform,
    ip: networkInfo.ip,
    city: networkInfo.city,
    region: networkInfo.region,
    country: networkInfo.country,
    locationString: networkInfo.locationString,
    userAgent,
  };
}
