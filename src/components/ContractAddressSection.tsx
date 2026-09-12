import React, { useState, useEffect, useRef } from 'react';
import { Clipboard, X, Zap, ChevronDown, Sparkles } from 'lucide-react';
import { ChainId } from '../types';
import { RAW_EVM_CHAINS, getChainInfo, normalizeChainKey } from '../constants/chains';
import { ApiKeyConfig } from '../services/apiKeys';
import { processClipboardAutoPaste, extractContractAddress } from '../services/smartAutoPaste';
import { detectTokenBlockchain, chainIdToSelectorId, DetectedChain } from '../services/chainDetection';
import { ChainSelectorModal, getChainLogoUrl } from './ChainSelectorModal';
import { useTranslation } from '../context/I18nContext';

interface ContractAddressSectionProps {
  addressInput: string;
  setAddressInput: (val: string) => void;
  selectedChain: ChainId;
  onSelectChain?: (chainId: ChainId) => void;
  onFetchToken: (addrToFetch?: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  apiKeys?: ApiKeyConfig;
  statusMessage?: string | null;
  isVerifying?: boolean;
}

export const ContractAddressSection: React.FC<ContractAddressSectionProps> = ({
  addressInput, setAddressInput, selectedChain, onSelectChain, onFetchToken, isLoading, errorMessage, apiKeys, statusMessage, isVerifying,
}) => {
  const { t } = useTranslation();
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [detectedChain, setDetectedChain] = useState<DetectedChain | null>(null);
  const lastProcessedRef = useRef<string | null>(extractContractAddress(addressInput) ? addressInput.toLowerCase() : null);

  useEffect(() => setImgError(false), [selectedChain]);

  // Keep lastProcessedRef synchronized with addressInput
  useEffect(() => {
    if (addressInput && addressInput.trim()) {
      const valid = extractContractAddress(addressInput.trim());
      if (valid) {
        lastProcessedRef.current = valid.toLowerCase();
      }
    }
  }, [addressInput]);

  const currentChainInfo = detectedChain && String(detectedChain.chainId) === String(selectedChain)
    ? { name: detectedChain.name }
    : getChainInfo(selectedChain);
  const normalizedKey = normalizeChainKey(selectedChain);
  const currentRawDef = RAW_EVM_CHAINS[normalizedKey];
  const currentLogoUrl = detectedChain && String(detectedChain.chainId) === String(selectedChain)
    ? getChainLogoUrl({ id: detectedChain.chainId, name: detectedChain.name, dexScreenerChain: detectedChain.blockchain })
    : getChainLogoUrl(selectedChain);

  const prepareFetch = async (addr: string, forceDetection = false) => {
    const clean = addr.trim();
    if (!clean || clean.length < 1) return;

    if (onSelectChain) {
      try {
        const detected = await detectTokenBlockchain(clean);
        if (detected && !detected.isUnknown && detected.chainId && detected.chainId !== 'unknown') {
          setDetectedChain(detected);
          const selectorId = chainIdToSelectorId(detected.chainId) as ChainId;
          if (String(selectorId) !== String(selectedChain)) {
            // Silently switch chain without showing any message
            onSelectChain(selectorId);
          }
        }
      } catch (err) {
        console.warn('Chain auto-detection skipped:', err);
      }
    }

    // Always continue to fetch token metadata directly without blocking
    onFetchToken(clean);
  };

  const triggerAutoPaste = async () => {
    if (isLoading || isVerifying) return;
    await processClipboardAutoPaste(addressInput, lastProcessedRef.current, setAddressInput, (newAddr) => {
      lastProcessedRef.current = newAddr.toLowerCase();
      void prepareFetch(newAddr, false);
    });
  };

  useEffect(() => {
    triggerAutoPaste();
    const handleFocus = () => { void triggerAutoPaste(); };
    const handleVisibility = () => { if (document.visibilityState === 'visible') void triggerAutoPaste(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { window.removeEventListener('focus', handleFocus); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  const handlePaste = async () => {
    const res = await processClipboardAutoPaste(addressInput, lastProcessedRef.current, setAddressInput, (newAddr) => {
      lastProcessedRef.current = newAddr.toLowerCase();
      void prepareFetch(newAddr, false);
    });
    if (res.status === 'PERMISSION_DENIED' || res.status === 'CLIPBOARD_EMPTY') {
      const fallbackText = window.prompt('Paste a token/asset identifier (EVM, Solana, TON, TRON, XRPL, Polkadot, or another supported/indexed blockchain):');
      if (fallbackText && fallbackText.trim()) {
        const valid = extractContractAddress(fallbackText);
        if (valid) {
          const norm = valid.toLowerCase();
          setAddressInput(valid);
          if (norm !== lastProcessedRef.current) {
            lastProcessedRef.current = norm;
            void prepareFetch(valid, false);
          }
        } else setAddressInput('');
      }
    }
  };

  const handleClear = () => {
    setAddressInput('');
    setDetectedChain(null);
  };

  return (
    <div className="relative bg-[#0B0E17]/90 border border-zinc-800/90 rounded-lg p-2 shadow-md backdrop-blur-sm space-y-1.5">
      <div className="flex items-center space-x-1.5 w-full">
        {onSelectChain && <button type="button" onClick={() => setIsChainModalOpen(true)} className="px-2 py-1 bg-[#06080F] hover:bg-zinc-900 border border-zinc-800 rounded-lg flex items-center space-x-1 shrink-0 h-9 transition-all cursor-pointer group" title={`Network: ${currentChainInfo.name}`}>
          <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
            {currentLogoUrl && !imgError ? <img src={currentLogoUrl} alt={currentChainInfo.name} className="w-full h-full object-contain rounded-full" onError={() => setImgError(true)} /> : <div className="w-full h-full rounded-full flex items-center justify-center font-mono text-[8px] font-bold text-white" style={{ backgroundColor: currentRawDef?.themeColor || '#3f3f46' }}>{(currentRawDef?.symbol || currentChainInfo.name).slice(0, 3)}</div>}
          </div>
          <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
        </button>}

        <div className="flex-1 flex items-center bg-[#06080F] border border-zinc-800 rounded-lg focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all px-2 h-9 min-w-0 space-x-1.5">
          <button type="button" onClick={handlePaste} className="p-1 hover:bg-zinc-800 text-[#00E575] hover:text-emerald-300 rounded transition-colors cursor-pointer shrink-0" title={t('contract.pasteTooltip', 'Paste token or asset identifier from clipboard')}><Clipboard className="w-3.5 h-3.5" /></button>
          <input type="text" value={addressInput} onChange={(e) => setAddressInput(e.target.value)} placeholder={t('contract.inputPlaceholder', 'Paste token/asset identifier (EVM, Solana, TON, TRON, XRPL...)...')} className="w-full bg-transparent text-white font-mono text-[11px] focus:outline-none placeholder:text-zinc-600 truncate" onKeyDown={(e) => { if (e.key === 'Enter') void prepareFetch(addressInput, true); }} />
          {addressInput && <button type="button" onClick={handleClear} className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer shrink-0" title={t('common.clear', 'Clear')}><X className="w-3 h-3" /></button>}
          <button type="button" onClick={() => void prepareFetch(addressInput, true)} disabled={isLoading || isVerifying || !addressInput.trim()} className="px-2.5 py-1 bg-[#00E575] hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-[10px] rounded-md shadow transition-all cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1 shrink-0 h-7">
            {isLoading || isVerifying ? <><div className="w-2.5 h-2.5 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" /><span>{t('contract.analyzing', 'Analyzing Contract...')}</span></> : <><Zap className="w-2.5 h-2.5 fill-black stroke-black shrink-0" /><span>{t('contract.verify', 'Verify')}</span></>}
          </button>
        </div>
      </div>

      {pasteNotice && <div className="bg-[#00E575]/10 border border-[#00E575]/30 rounded-md p-1.5 text-[9.5px] text-[#00E575] font-semibold flex items-center space-x-2 animate-in fade-in"><Sparkles className="w-3 h-3 text-[#00E575] shrink-0" /><span>{pasteNotice}</span></div>}
      {statusMessage && (isLoading || isVerifying) && <div className="bg-[#00E575]/10 border border-[#00E575]/30 rounded-md p-1.5 text-[9.5px] text-[#00E575] font-semibold flex items-center space-x-2 animate-in fade-in transition-all"><div className="w-2 h-2 rounded-full bg-[#00E575] animate-ping shrink-0" /><span>{statusMessage}</span></div>}
      {errorMessage && <div className="bg-red-500/10 border border-red-500/30 rounded-md p-1.5 text-[9px] text-red-300 flex items-center space-x-1.5 animate-in fade-in"><X className="w-3 h-3 text-red-400 shrink-0" /><span>{errorMessage}</span></div>}

      {onSelectChain && <ChainSelectorModal isOpen={isChainModalOpen} onClose={() => setIsChainModalOpen(false)} selectedChain={selectedChain} onSelectChain={onSelectChain} detectedChain={detectedChain} />}
    </div>
  );
};
