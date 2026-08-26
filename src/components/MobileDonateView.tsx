import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clipboard, Zap, ChevronDown, HeartHandshake, ShieldCheck, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { ChainId, SubmittedToken } from '../types';
import { RAW_EVM_CHAINS, getChainInfo, normalizeChainKey } from '../constants/chains';
import { LogoVerificationReport } from '../services/logoVerificationEngine';
import { ApiKeyConfig } from '../services/apiKeys';
import { processClipboardAutoPaste, extractContractAddress } from '../services/smartAutoPaste';
import { TokenInformationCard } from './TokenInformationCard';
import { LogoVerificationCard } from './LogoVerificationCard';
import { DonationSettingsCard } from './DonationSettingsCard';
import { ChainSelectorModal, getChainLogoUrl } from './ChainSelectorModal';
import { TokenHuntCard } from './TokenHuntCard';
import { LogoStatus } from '../types';
import { useTranslation } from '../context/I18nContext';

interface MobileDonateViewProps {
  addressInput: string;
  setAddressInput: (val: string) => void;
  selectedChain: ChainId;
  setSelectedChain: (chain: ChainId) => void;
  onFetchToken: (addrToFetch?: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  autoSwitchNotice?: string | null;
  apiKeys?: ApiKeyConfig;
  fetchedToken: SubmittedToken | null;
  setFetchedToken: React.Dispatch<React.SetStateAction<SubmittedToken | null>>;
  logoReport: LogoVerificationReport | null;
  logoStatus?: LogoStatus;
  setLogoStatus?: (status: LogoStatus) => void;
  tokens: SubmittedToken[];
  handleSaveToken: () => void;
  handleResetForm: () => void;
  isSavingToken: boolean;
  isVerifying?: boolean;
  verificationStage?: number;
}

export const MobileDonateView: React.FC<MobileDonateViewProps> = ({
  addressInput,
  setAddressInput,
  selectedChain,
  setSelectedChain,
  onFetchToken,
  isLoading,
  errorMessage,
  autoSwitchNotice,
  apiKeys,
  fetchedToken,
  setFetchedToken,
  logoReport,
  logoStatus = 'checking',
  setLogoStatus,
  tokens,
  handleSaveToken,
  handleResetForm,
  isSavingToken,
  isVerifying = false,
  verificationStage = 4,
}) => {
  const { t } = useTranslation();
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const lastProcessedRef = useRef<string | null>(
    fetchedToken?.address ? fetchedToken.address.toLowerCase() : null
  );

  // Sync ref with current fetched token address if available
  useEffect(() => {
    if (fetchedToken?.address && fetchedToken.id !== 'token-pending') {
      lastProcessedRef.current = fetchedToken.address.toLowerCase();
    }
  }, [fetchedToken?.address, fetchedToken?.id]);

  useEffect(() => {
    setImgError(false);
  }, [selectedChain]);

  const currentChainInfo = getChainInfo(selectedChain);
  const normalizedKey = normalizeChainKey(selectedChain);
  const currentRawDef = RAW_EVM_CHAINS[normalizedKey] || RAW_EVM_CHAINS['137'];
  const currentLogoUrl = getChainLogoUrl(selectedChain);

  // Smart Auto-Paste Executor (Runs completely silently)
  const triggerAutoPaste = async () => {
    await processClipboardAutoPaste(
      addressInput,
      lastProcessedRef.current,
      setAddressInput,
      (newAddr) => {
        lastProcessedRef.current = newAddr.toLowerCase();
        onFetchToken(newAddr);
      }
    );
  };

  // Trigger auto-pasting on component mount AND whenever user returns to the app (window focus/visibility)
  useEffect(() => {
    triggerAutoPaste();

    const handleFocus = () => {
      triggerAutoPaste();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerAutoPaste();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handlePaste = async () => {
    const res = await processClipboardAutoPaste(
      addressInput,
      lastProcessedRef.current,
      setAddressInput,
      (newAddr) => {
        lastProcessedRef.current = newAddr.toLowerCase();
        onFetchToken(newAddr);
      }
    );

    if (res.status === 'PERMISSION_DENIED' || res.status === 'CLIPBOARD_EMPTY') {
      const fallbackText = window.prompt('Paste contract address (EVM, TON, SOL, XRPL) below:');
      if (fallbackText && fallbackText.trim()) {
        const valid = extractContractAddress(fallbackText);
        if (valid) {
          const norm = valid.toLowerCase();
          if (norm === lastProcessedRef.current) {
            setAddressInput(valid);
          } else {
            setAddressInput(valid);
            lastProcessedRef.current = norm;
            onFetchToken(valid);
          }
        } else {
          // Non-address rich text entered -> automatically clean it without saying anything!
          setAddressInput('');
        }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden text-white font-sans animate-in fade-in duration-200">
      {/* 1. FIXED TOP NAVIGATION CARD FOR DONATE PAGE (Replaces default profile header) */}
      <header className="shrink-0 z-40 bg-[#090C12] backdrop-blur-xl border-b border-emerald-500/30 rounded-b-2xl p-2.5 pt-safe-nav shadow-[0_4px_25px_rgba(0,0,0,0.7)] max-w-md mx-auto w-full transition-all">
        <div className="flex items-center space-x-2">
          {/* Left: Active Network Badge Selector */}
          <button
            type="button"
            onClick={() => setIsChainModalOpen(true)}
            className="px-2 py-1.5 bg-[#06080F] hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl flex items-center space-x-1.5 shrink-0 h-10 transition-all cursor-pointer group"
            title={`Network: ${currentChainInfo.name}`}
          >
            <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 flex items-center justify-center shrink-0">
              {currentLogoUrl && !imgError ? (
                <img
                  src={currentLogoUrl}
                  alt={currentChainInfo.name}
                  className="w-full h-full object-contain rounded-md"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full rounded-md flex items-center justify-center font-mono text-[9px] font-bold text-white"
                  style={{ backgroundColor: currentRawDef?.themeColor || '#22C55E' }}
                >
                  {String(currentRawDef?.symbol || 'EVM').slice(0, 3)}
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-zinc-200 max-w-[65px] truncate hidden sm:inline">
              {currentChainInfo.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Center: Contract Address Input Card */}
          <div className="flex-1 flex items-center bg-[#06080F] border border-zinc-800 focus-within:border-[#22C55E] focus-within:ring-1 focus-within:ring-[#22C55E]/30 rounded-xl px-2.5 h-10 min-w-0 space-x-1.5 transition-all">
            <button
              type="button"
              onClick={handlePaste}
              className="p-1 text-[#4ADE80] hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Paste contract address from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>

            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder={t('mobileDonate.pastePlaceholder', 'Paste contract address (EVM, TON, SOL, XRPL...)...')}
              className="w-full bg-transparent text-white font-mono text-[11px] focus:outline-none placeholder:text-zinc-600 truncate"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onFetchToken();
                }
              }}
            />

            {addressInput && (
              <button
                type="button"
                onClick={() => setAddressInput('')}
                className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
                title={t('common.clear', 'Clear input')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Verify Action Button */}
          <button
            type="button"
            onClick={() => onFetchToken()}
            disabled={isLoading || !addressInput.trim()}
            className="px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-40 text-black font-black text-xs rounded-xl shadow-[0_2px_12px_rgba(34,197,94,0.4)] transition-all cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1 shrink-0 h-10"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-black stroke-black shrink-0" />
                <span>{t('mobileDonate.verify', 'Verify')}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. PAGE CONTENT BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3.5 pb-24 max-w-md mx-auto w-full">
        {/* Token Donation Page Intro Banner */}
        <div className="bg-gradient-to-r from-[#0C151F] via-[#0E1B2B] to-[#0A131C] border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#4ADE80] font-bold uppercase tracking-wider flex items-center space-x-1">
                <span>{t('mobileDonate.tokenDonationHub', 'Token Donation Hub')}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              </div>
              <h2 className="text-xs font-bold text-white mt-0.5">{t('mobileDonate.verifyAndConfigure', 'Verify & Configure Donation Campaigns')}</h2>
            </div>
          </div>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
            {currentChainInfo.name}
          </span>
        </div>

        {/* 3. Stacked Cards for Real Fetched Token or Empty Search State */}
        {fetchedToken ? (
          <div className="space-y-3.5 animate-in fade-in duration-300">
            {/* Token Information & Multi-Provider Verification Engine Card */}
            <TokenInformationCard
              metadata={fetchedToken.metadata}
              marketData={fetchedToken.marketData}
              safety={fetchedToken.safety}
              selectedChain={selectedChain}
              verificationReport={fetchedToken.verificationReport}
              isSkeleton={isLoading || isVerifying || fetchedToken.id === 'token-pending'}
              stage={verificationStage}
              isVerifying={isLoading || isVerifying}
              onUpdateLogo={(logoUrl) => {
                setFetchedToken((prev) =>
                  prev
                    ? {
                        ...prev,
                        metadata: {
                          ...prev.metadata,
                          logoUrl,
                        },
                      }
                    : null
                );
              }}
            />

            {/* Logo Processing & Optimization Engine Card */}
            <LogoVerificationCard
              report={logoReport}
              logoStatus={logoStatus}
              onLogoStatusChange={setLogoStatus}
              isSkeleton={isLoading || isVerifying || fetchedToken.id === 'token-pending'}
              stage={verificationStage}
              isVerifying={isLoading || isVerifying}
              onUpdateLogo={(logoUrl) => {
                setFetchedToken((prev) =>
                  prev
                    ? {
                        ...prev,
                        metadata: {
                          ...prev.metadata,
                          logoUrl,
                        },
                      }
                    : null
                );
              }}
            />

            {/* Donation Campaign Settings Card */}
            <DonationSettingsCard
              metadata={fetchedToken.metadata}
              selectedChain={selectedChain}
              logoReport={logoReport}
              logoStatus={logoStatus}
              trustScore={fetchedToken.verificationReport?.trustScore ?? fetchedToken.safety?.score}
              isAlreadySaved={tokens.some(
                (t) => t.address.toLowerCase().trim() === fetchedToken.address.toLowerCase().trim()
              )}
              onSaveToken={handleSaveToken}
              onCancel={handleResetForm}
              isSaving={isSavingToken}
              isVerifying={isLoading || isVerifying}
              stage={verificationStage}
            />
          </div>
        ) : (
          <div className="bg-[#0B0E17]/80 border border-zinc-800/80 rounded-2xl p-5 text-center space-y-3 shadow-md">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-[#4ADE80]">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {t('mobileDonate.evmVerificationPanel', 'EVM Token Verification Panel')}
              </h3>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto leading-relaxed">
                {t(
                  'mobileDonate.evmPanelDesc',
                  'Paste any ERC-20 contract address in the top bar above and click Verify to analyze live market data, smart contract security rating, and list it for token donations.'
                )}
              </p>
            </div>

            <div className="pt-2 grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-400">
              <div className="bg-[#06080E] border border-zinc-800/80 p-2 rounded-xl">
                <div className="font-bold text-emerald-400 mb-0.5">{t('mobileDonate.pasteStep', '1. Paste')}</div>
                <span>{t('mobileDonate.pasteStepDesc', 'EVM Contract Address')}</span>
              </div>
              <div className="bg-[#06080E] border border-zinc-800/80 p-2 rounded-xl">
                <div className="font-bold text-emerald-400 mb-0.5">{t('mobileDonate.verifyStep', '2. Verify')}</div>
                <span>{t('mobileDonate.verifyStepDesc', 'On-Chain Security')}</span>
              </div>
              <div className="bg-[#06080E] border border-zinc-800/80 p-2 rounded-xl">
                <div className="font-bold text-emerald-400 mb-0.5">{t('mobileDonate.donateStep', '3. Donate')}</div>
                <span>{t('mobileDonate.donateStepDesc', 'Earn REWARD Tokens')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Token Hunt Card & Platform Discovery Section */}
        <TokenHuntCard />
      </div>

      {/* Modal for Selecting Network Chain */}
      <ChainSelectorModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        selectedChain={selectedChain}
        onSelectChain={(chain) => {
          setSelectedChain(chain);
          setIsChainModalOpen(false);
        }}
      />
    </div>
  );
};
