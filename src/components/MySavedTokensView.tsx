import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Copy,
  Check,
  Send,
  Zap,
  Layers,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  SavedTokenItem,
  getLocalSavedTokens,
  removeLocalSavedToken,
  clearLocalSavedTokens,
  verifyTokensBatch,
  batchSaveTokensToBackend,
  saveLocalSavedTokens,
  MAX_SAVED_TOKENS,
} from '../services/tokenBatchVerificationService';
import { useTranslation } from '../context/I18nContext';

interface MySavedTokensViewProps {
  userId?: string;
  onBackToDonate: () => void;
  onNavigateAddToken: () => void;
  onSavedTokensCountChange?: (count: number) => void;
}

export const MySavedTokensView: React.FC<MySavedTokensViewProps> = ({
  userId,
  onBackToDonate,
  onNavigateAddToken,
  onSavedTokensCountChange,
}) => {
  const { t } = useTranslation();
  const [savedTokens, setSavedTokens] = useState<SavedTokenItem[]>(() => getLocalSavedTokens(userId));
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [hasVerifiedBatch, setHasVerifiedBatch] = useState(false);
  const [batchSaveResult, setBatchSaveResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Re-read storage and refresh local list
  const refreshTokensFromStorage = useCallback(() => {
    const list = getLocalSavedTokens(userId);
    setSavedTokens(list);
    if (onSavedTokensCountChange) {
      onSavedTokensCountChange(list.length);
    }
  }, [userId, onSavedTokensCountChange]);

  // Sync on mount and listen to window storage update events
  useEffect(() => {
    refreshTokensFromStorage();

    const handleUpdate = () => {
      refreshTokensFromStorage();
    };

    window.addEventListener('tokencare_saved_tokens_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('tokencare_saved_tokens_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshTokensFromStorage]);

  // Sync count to parent whenever list changes
  useEffect(() => {
    if (onSavedTokensCountChange) {
      onSavedTokensCountChange(savedTokens.length);
    }
  }, [savedTokens.length, onSavedTokensCountChange]);

  // Derived counts for verified state
  const availableTokens = useMemo(() => {
    return savedTokens.filter((t) => t.verificationStatus === 'available' || (hasVerifiedBatch && t.verificationDetails?.exists === false));
  }, [savedTokens, hasVerifiedBatch]);

  const existingTokens = useMemo(() => {
    return savedTokens.filter((t) => t.verificationStatus === 'exists' || (hasVerifiedBatch && t.verificationDetails?.exists === true));
  }, [savedTokens, hasVerifiedBatch]);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleRemove = (contractAddress: string, blockchain: string) => {
    const updated = removeLocalSavedToken(contractAddress, blockchain, userId);
    setSavedTokens(updated);
  };

  const handleClearAll = () => {
    if (window.confirm(t('savedTokens.confirmClear', 'Are you sure you want to clear all saved tokens?'))) {
      clearLocalSavedTokens(userId);
      setSavedTokens([]);
      setHasVerifiedBatch(false);
      setBatchSaveResult(null);
    }
  };

  // 4. VERIFY ALL TOKENS (Dynamic call to verifyTokensBatch Edge Function)
  const handleVerifyAll = async () => {
    if (savedTokens.length === 0 || isVerifyingAll) return;
    setIsVerifyingAll(true);
    setBatchSaveResult(null);

    try {
      // Build dynamic request payload
      const tokensPayload = savedTokens.map((t) => ({
        blockchain: (t.blockchain || 'ethereum').toLowerCase(),
        contractAddress: t.contractAddress.trim(),
      }));

      const response = await verifyTokensBatch(tokensPayload);

      // Match each result item back to the corresponding token using blockchain + contractAddress
      const resultsMap = new Map<string, { exists: boolean; ownedBy?: string | null; error?: string | null }>();

      response.results?.forEach((r) => {
        const key = `${(r.blockchain || '').toLowerCase().trim()}:${(r.contractAddress || '').toLowerCase().trim()}`;
        resultsMap.set(key, { exists: r.exists, ownedBy: r.ownedBy, error: r.error });
      });

      const updatedList = savedTokens.map((item) => {
        const key = `${(item.blockchain || '').toLowerCase().trim()}:${(item.contractAddress || '').toLowerCase().trim()}`;
        const match = resultsMap.get(key);

        if (match) {
          const exists = match.exists;
          return {
            ...item,
            verificationStatus: (exists ? 'exists' : 'available') as 'exists' | 'available',
            verificationDetails: {
              exists,
              ownedBy: match.ownedBy || null,
              error: match.error || null,
              verifiedAt: new Date().toISOString(),
            },
          };
        }

        // Default to available if result not found
        return {
          ...item,
          verificationStatus: 'available' as const,
          verificationDetails: {
            exists: false,
            error: null,
            verifiedAt: new Date().toISOString(),
          },
        };
      });

      setSavedTokens(updatedList);
      saveLocalSavedTokens(updatedList, userId);
      setHasVerifiedBatch(true);
    } catch (err: any) {
      console.warn('[MySavedTokensView] Verify all note:', err);
    } finally {
      setIsVerifyingAll(false);
    }
  };

  // 8. BATCH SAVE TOKENS (Calls batchSaveTokens with available tokens only)
  const handleSaveAvailableTokens = async () => {
    if (availableTokens.length === 0 || isBatchSaving) return;
    setIsBatchSaving(true);
    setBatchSaveResult(null);

    try {
      const tokensToSave = availableTokens.map((t) => ({
        name: t.name,
        symbol: t.symbol,
        contractAddress: t.contractAddress,
        blockchain: t.blockchain,
        logoUrl: t.logoUrl || '',
        chainId: t.chainId,
      }));

      const res = await batchSaveTokensToBackend(userId || 'anonymous_user', tokensToSave);

      if (res.success) {
        const earnedTC = res.rewardEarnedTC ?? (tokensToSave.length * 15);
        setBatchSaveResult({
          type: 'success',
          message: res.message || `Successfully registered ${tokensToSave.length} available token(s)! Earned +${earnedTC} TC (+15 TC each) credited to your balance!`,
        });

        // Dispatch window events to immediately refresh wallet balance and notification counts across the app
        window.dispatchEvent(new CustomEvent('tokencare_wallet_updated'));
        window.dispatchEvent(new CustomEvent('tokencare_notifications_updated'));

        // Mark saved available tokens as exists/registered or update local list
        const updatedList = savedTokens.map((item) => {
          const isSavedItem = tokensToSave.some(
            (saved) =>
              saved.contractAddress.toLowerCase() === item.contractAddress.toLowerCase() &&
              saved.blockchain.toLowerCase() === item.blockchain.toLowerCase()
          );

          if (isSavedItem) {
            return {
              ...item,
              verificationStatus: 'exists' as const,
              verificationDetails: {
                exists: true,
                error: null,
                verifiedAt: new Date().toISOString(),
              },
            };
          }
          return item;
        });

        setSavedTokens(updatedList);
        saveLocalSavedTokens(updatedList, userId);
      } else {
        setBatchSaveResult({
          type: 'error',
          message: res.error || 'Failed to complete batch save to backend.',
        });
      }
    } catch (err: any) {
      setBatchSaveResult({
        type: 'error',
        message: err?.message || 'Network error occurred during batch save.',
      });
    } finally {
      setIsBatchSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden text-white font-sans animate-in fade-in duration-200 bg-[#06080E]">
      {/* 1. DEDICATED HEADER: "My Saved Tokens" */}
      <header className="shrink-0 z-40 bg-[#090C12] backdrop-blur-xl border-b border-emerald-500/30 rounded-b-2xl p-3 sm:p-4 pt-safe-nav shadow-[0_4px_25px_rgba(0,0,0,0.7)] max-w-md md:max-w-5xl lg:max-w-7xl mx-auto w-full transition-all flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onBackToDonate}
            className="p-1.5 bg-[#06080F] hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Back to Token Lookup"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wide">My Saved Tokens</h1>
              <span className="text-[10px] sm:text-xs font-mono font-bold bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30 px-2 py-0.2 rounded-full">
                {savedTokens.length}/{MAX_SAVED_TOKENS}
              </span>
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-400">Local pending token batch verification & management</div>
          </div>
        </div>

        {savedTokens.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-1.5 bg-zinc-900/80 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
            title="Clear all saved tokens"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        )}
      </header>

      {/* 2. SCROLLABLE BODY CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 pb-32 max-w-md md:max-w-5xl lg:max-w-7xl mx-auto w-full">
        {/* Info Banner / Verification Results Overview */}
        {savedTokens.length > 0 && (
          <div className="bg-gradient-to-r from-[#0C151F] via-[#0E1B2B] to-[#0A131C] border border-emerald-500/20 rounded-2xl p-4 shadow-md space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Pending Saved Tokens ({savedTokens.length})</h2>
                  <p className="text-xs text-zinc-400 leading-tight">
                    {hasVerifiedBatch
                      ? `${existingTokens.length} token(s) already exist • ${availableTokens.length} token(s) available for batch saving`
                      : 'Saved locally in your browser. Click Verify All Tokens below to validate registration status.'}
                  </p>
                </div>
              </div>

              {hasVerifiedBatch && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {availableTokens.length} Ready
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Batch Save Result Notification */}
        {batchSaveResult && (
          <div
            className={`p-3 rounded-2xl border flex items-start space-x-2.5 text-xs animate-in fade-in duration-200 shadow-lg ${
              batchSaveResult.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
            }`}
          >
            {batchSaveResult.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[11px] uppercase tracking-wide mb-0.5">
                {batchSaveResult.type === 'success' ? 'Save Complete' : 'Edge Function / Save Error'}
              </div>
              <div className="font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap select-all text-zinc-200 bg-black/40 p-2 rounded-xl border border-white/5 mt-1">
                {batchSaveResult.message}
              </div>
            </div>
          </div>
        )}

        {/* 3. SAVED TOKENS LIST / EMPTY STATE */}
        {savedTokens.length === 0 ? (
          <div className="bg-[#0B0E17]/80 border border-zinc-800/80 rounded-2xl p-6 text-center space-y-4 shadow-md my-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">No Saved Tokens Yet</h3>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Save tokens using the Save button on the Donate page to build your batch verification list.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToDonate}
                className="px-4 py-2 bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-black font-bold text-xs rounded-xl shadow-[0_2px_12px_rgba(34,197,94,0.3)] transition-all cursor-pointer inline-flex items-center space-x-1.5"
              >
                <span>Go to Donate Page</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-in fade-in duration-300">
            {savedTokens.map((token) => {
              const tokenKey = `${token.blockchain.toLowerCase()}:${token.contractAddress.toLowerCase()}`;

              return (
                <div
                  key={token.id || tokenKey}
                  className="bg-[#0C0E17]/95 border border-zinc-800/90 hover:border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-md transition-all relative group flex flex-col justify-between"
                >
                  {/* Top Row: Token Name, Symbol, Blockchain, Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Logo / Badge */}
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        {token.logoUrl ? (
                          <img
                            src={token.logoUrl}
                            alt={token.symbol}
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
                            {token.symbol.slice(0, 3)}
                          </div>
                        )}
                      </div>

                      {/* Name & Blockchain */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-white truncate">{token.name}</h3>
                          <span className="text-[10px] font-mono font-bold text-[#4ADE80] bg-[#22C55E]/10 px-1.5 py-0.2 rounded">
                            {token.symbol}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-zinc-300 font-medium mt-0.5 flex items-center space-x-1.5">
                          <span>{token.blockchain}</span>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(token.contractAddress, token.blockchain)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Remove from saved list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Contract Address Bar */}
                  <div className="flex items-center justify-between bg-[#06080F] border border-zinc-800/80 rounded-xl px-2.5 py-1.5 text-[10px] font-mono">
                    <span className="text-zinc-400 truncate">{token.contractAddress}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(token.contractAddress)}
                      className="ml-2 text-zinc-400 hover:text-emerald-400 flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
                      title="Copy Address"
                    >
                      {copiedAddress === token.contractAddress ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-[9px] text-emerald-400 font-sans">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Bottom: Verification Status Indicator */}
                  {token.verificationStatus && token.verificationStatus !== 'unverified' && (
                    <div className="pt-1 flex items-center justify-between border-t border-zinc-800/60 text-[10.5px]">
                      <span className="text-zinc-400">Status:</span>
                      {token.verificationStatus === 'exists' ? (
                        <span className="flex items-center space-x-1 text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Already Saved</span>
                        </span>
                      ) : token.verificationStatus === 'available' ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Available</span>
                        </span>
                      ) : token.verificationStatus === 'error' ? (
                        <span className="flex items-center space-x-1 text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Error verifying</span>
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FIXED BOTTOM ACTION BAR: [ VERIFY ALL TOKENS ] -> [ SAVE X AVAILABLE TOKENS ] */}
      {savedTokens.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#090C12]/95 backdrop-blur-xl border-t border-emerald-500/30 p-3 sm:p-4 pb-safe-nav shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
          <div className="max-w-md md:max-w-5xl lg:max-w-7xl mx-auto">
            {!hasVerifiedBatch ? (
              /* State 1: Before verification -> [ VERIFY ALL TOKENS ] */
              <button
                type="button"
                onClick={handleVerifyAll}
                disabled={isVerifyingAll}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#15803D] hover:to-[#16A34A] disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-[0_4px_20px_rgba(34,197,94,0.4)] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {isVerifyingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Verifying All Tokens...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black stroke-black" />
                    <span>Verify All Tokens ({savedTokens.length})</span>
                  </>
                )}
              </button>
            ) : (
              /* State 2: After verification -> [ SAVE X AVAILABLE TOKENS ] or Summary */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-zinc-400">
                    <strong className="text-amber-400">{existingTokens.length}</strong> already saved •{' '}
                    <strong className="text-emerald-400">{availableTokens.length}</strong> available to save
                  </span>
                  <button
                    type="button"
                    onClick={handleVerifyAll}
                    disabled={isVerifyingAll}
                    className="text-zinc-400 hover:text-emerald-400 flex items-center space-x-1 transition-colors cursor-pointer text-xs font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingAll ? 'animate-spin' : ''}`} />
                    <span>Re-verify</span>
                  </button>
                </div>

                {availableTokens.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleSaveAvailableTokens}
                    disabled={isBatchSaving}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#15803D] hover:to-[#16A34A] disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-[0_4px_20px_rgba(34,197,94,0.4)] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    {isBatchSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Saving {availableTokens.length} Available Tokens...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          Save {availableTokens.length} Available Token{availableTokens.length > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 bg-zinc-900 border border-zinc-800 text-zinc-500 font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center space-x-2 cursor-not-allowed opacity-80"
                  >
                    <CheckCircle2 className="w-4 h-4 text-zinc-600" />
                    <span>All Tokens Already Saved</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
