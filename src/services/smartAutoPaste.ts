/**
 * Smart Auto-Paste & Contract Address Verification Service
 */

import { isXrplAddress, isTonAddress, isSolanaAddress, isTronAddress } from '../constants/chains';

// Extract a valid crypto contract address or asset identifier from raw text or URLs
export function extractContractAddress(rawText: string): string | null {
  if (!rawText) return null;
  const clean = rawText.trim();

  // 1. Direct match EVM contract address (0x + 40 hex chars)
  if (/^0x[a-fA-F0-9]{40}$/i.test(clean)) {
    return clean;
  }

  // 2. Direct match TON contract address (e.g. EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT)
  if (isTonAddress(clean)) {
    return clean;
  }

  // 3. Direct match XRPL issued asset (currency.issuer e.g. 41524D59...rGG3...) or account (r...)
  if (isXrplAddress(clean)) {
    return clean;
  }

  // 4. Direct match Solana / TRON / Base58 address (32 to 44 base58 chars)
  if (isSolanaAddress(clean) || isTronAddress(clean) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
    return clean;
  }

  // 5. Embedded EVM address inside a URL or string (e.g., DexScreener/Etherscan link)
  const evmMatch = clean.match(/0x[a-fA-F0-9]{40}/i);
  if (evmMatch) {
    return evmMatch[0];
  }

  // 6. Embedded TON address inside a URL or string (e.g., Tonscan, DexScreener, Tonkeeper links)
  const tonMatch = clean.match(/(EQ|UQ|kQ|0Q|Ef|Uf)[A-Za-z0-9_-]{40,64}(__?[A-Za-z0-9]+)?/i);
  if (tonMatch) {
    return tonMatch[0];
  }

  // 7. Embedded XRPL issued asset inside a URL or string
  const xrplMatch = clean.match(/[a-zA-Z0-9]{3,40}\.r[1-9A-HJ-NP-Za-km-z]{24,34}/);
  if (xrplMatch) {
    return xrplMatch[0];
  }

  // 8. Broad fallback for clean single non-whitespace crypto token address string (20-90 chars)
  if (
    clean.length >= 20 &&
    clean.length <= 90 &&
    !/\s/.test(clean) &&
    /^[A-Za-z0-9_\-\.:]+$/.test(clean)
  ) {
    return clean;
  }

  // If text is rich text, sentence, or non-address content, return null
  return null;
}

export interface SmartPasteResult {
  status: 'CLEANED_INVALID' | 'ALREADY_FETCHED' | 'NEW_ADDRESS_FETCHING' | 'CLIPBOARD_EMPTY' | 'PERMISSION_DENIED';
  address?: string;
  message?: string;
}

/**
 * Core smart auto-paste function - operates completely silently without popup banners
 */
export async function processClipboardAutoPaste(
  currentAddressInput: string,
  lastProcessedAddress: string | null,
  setAddressInput: (val: string) => void,
  onFetchToken: (addr: string) => void
): Promise<SmartPasteResult> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
      return { status: 'PERMISSION_DENIED' };
    }

    const clipText = await navigator.clipboard.readText();
    if (!clipText || !clipText.trim()) {
      return { status: 'CLIPBOARD_EMPTY' };
    }

    const validAddress = extractContractAddress(clipText);

    // If text is not a contract address (e.g. rich text), automatically clean without saying anything!
    if (!validAddress) {
      if (currentAddressInput && !extractContractAddress(currentAddressInput)) {
        setAddressInput('');
      }
      return { status: 'CLEANED_INVALID' };
    }

    const normValid = validAddress.toLowerCase();
    const normLast = lastProcessedAddress ? lastProcessedAddress.toLowerCase() : '';

    if (normValid === normLast) {
      // Same contract address already loaded/fetched -> Do NOT refetch!
      setAddressInput(validAddress);
      return {
        status: 'ALREADY_FETCHED',
        address: validAddress,
        message: 'Address already loaded',
      };
    } else {
      // Different contract address -> set input and trigger verification automatically!
      setAddressInput(validAddress);
      onFetchToken(validAddress);
      return {
        status: 'NEW_ADDRESS_FETCHING',
        address: validAddress,
        message: 'New contract address auto-pasted and verifying',
      };
    }
  } catch (err) {
    return { status: 'PERMISSION_DENIED' };
  }
}
