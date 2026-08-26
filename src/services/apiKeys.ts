export interface ApiKeyConfig {
  infuraKey: string;
  alchemyKey: string;
}

const INFURA_STORAGE_KEY = 'web3_donations_infura_key';
const ALCHEMY_STORAGE_KEY = 'web3_donations_alchemy_key';

export function getStoredApiKeys(): ApiKeyConfig {
  try {
    const infuraKey = localStorage.getItem(INFURA_STORAGE_KEY) || '';
    const alchemyKey = localStorage.getItem(ALCHEMY_STORAGE_KEY) || '';
    return { infuraKey, alchemyKey };
  } catch (err) {
    console.warn('[Storage] Error reading API keys from localStorage:', err);
    return { infuraKey: '', alchemyKey: '' };
  }
}

export function saveApiKeys(keys: ApiKeyConfig): void {
  try {
    localStorage.setItem(INFURA_STORAGE_KEY, keys.infuraKey.trim());
    localStorage.setItem(ALCHEMY_STORAGE_KEY, keys.alchemyKey.trim());
  } catch (err) {
    console.warn('[Storage] Error saving API keys to localStorage:', err);
  }
}

export function isChainEnabled(
  chainProvider: 'infura' | 'alchemy',
  keys: ApiKeyConfig
): boolean {
  // If user provided custom key for provider, it is enabled!
  // If no keys are entered, we also allow public RPC fallback so users can preview, but mark provider keys.
  if (chainProvider === 'infura') {
    return keys.infuraKey.trim().length > 0;
  }
  if (chainProvider === 'alchemy') {
    return keys.alchemyKey.trim().length > 0;
  }
  return true;
}
