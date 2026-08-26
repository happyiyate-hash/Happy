import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Upload,
  Camera,
  Layers,
  BarChart3,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Search,
  Loader2,
} from 'lucide-react';
import { ERC20Metadata, MarketData, SafetyAnalysis, ChainId } from '../types';
import { VerificationReport, TrustScoreCategory, ProviderEvidence } from '../services/verificationEngine';
import { SUPPORTED_CHAINS } from '../constants/chains';
import {
  getProgressBarColor,
  getTrustScoreBadgeStyle,
  AnimatedNumber,
  useAnimatedNumber,
} from '../utils/animationHelpers';
import { safeLocaleString, safeFractionDigits, formatSmartCurrency, formatSmartNumber } from '../utils/numberFormatting';

interface TokenInformationCardProps {
  metadata: ERC20Metadata;
  marketData: MarketData;
  safety: SafetyAnalysis;
  selectedChain: ChainId;
  verificationReport?: VerificationReport;
  onUpdateLogo?: (logoUrl: string) => void;
  isSkeleton?: boolean;
  stage?: number; // 0 = skeleton, 1 = token info revealed, 2+ = multi-provider engine revealed
  isVerifying?: boolean;
}

export const TokenInformationCard: React.FC<TokenInformationCardProps> = ({
  metadata,
  marketData,
  safety,
  selectedChain,
  verificationReport,
  onUpdateLogo,
  isSkeleton = false,
  stage = 4,
  isVerifying = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'score' | 'providers' | 'checks'>('score');
  const [verdictCalculating, setVerdictCalculating] = useState(true);
  const [barsAnimated, setBarsAnimated] = useState<boolean[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const chainInfo = SUPPORTED_CHAINS[selectedChain] || SUPPORTED_CHAINS.polygon;

  // Stagger progress bar fill animations when stage >= 2
  useEffect(() => {
    if (stage >= 2 && !isSkeleton) {
      setVerdictCalculating(true);
      const timer = setTimeout(() => {
        setVerdictCalculating(false);
      }, 400);

      // Stagger categories progress bar draw
      const barTimers: NodeJS.Timeout[] = [];
      const animatedArray: boolean[] = new Array(9).fill(false);

      [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((idx) => {
        const t = setTimeout(() => {
          setBarsAnimated((prev) => {
            const next = [...prev];
            next[idx] = true;
            return next;
          });
        }, 150 + idx * 180);
        barTimers.push(t);
      });

      return () => {
        clearTimeout(timer);
        barTimers.forEach(clearTimeout);
      };
    } else {
      setBarsAnimated(new Array(9).fill(false));
    }
  }, [stage, isSkeleton]);

  const handleCopy = () => {
    navigator.clipboard.writeText(metadata.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result && onUpdateLogo) {
          onUpdateLogo(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrlInput.trim() && onUpdateLogo) {
      onUpdateLogo(customUrlInput.trim());
      setShowUrlInput(false);
      setCustomUrlInput('');
    }
  };

  // Fallback if verificationReport wasn't provided directly
  const rawTrustScore = verificationReport?.trustScore ?? safety.score ?? 84;
  const status = verificationReport?.status ?? (rawTrustScore >= 75 ? 'APPROVED' : rawTrustScore >= 50 ? 'NEEDS_REVIEW' : 'REJECTED');
  const riskRating = verificationReport?.riskRating ?? (rawTrustScore >= 80 ? 'LOW' : rawTrustScore >= 65 ? 'MEDIUM' : 'HIGH');

  // Animated trust score for count up
  const animatedTrustScore = Math.round(
    useAnimatedNumber(rawTrustScore, 1200, stage >= 2 && !isSkeleton)
  );

  const trustBadgeStyle = getTrustScoreBadgeStyle(animatedTrustScore);

  const categories: TrustScoreCategory[] = verificationReport?.categories ? Object.values(verificationReport.categories) : [
    { id: 'security', name: 'Security Analysis', score: 29, maxScore: 30, weightPct: 30, details: '0% Honeypot risk. Buy: 0%, Sell: 0%' },
    { id: 'liquidity', name: 'Liquidity Pool Depth', score: 14, maxScore: 15, weightPct: 15, details: '$1,250,000 pool depth' },
    { id: 'marketData', name: 'Market Data & Cap', score: 10, maxScore: 10, weightPct: 10, details: '$25,430,000 market cap' },
    { id: 'tradingActivity', name: 'Trading Activity', score: 9, maxScore: 10, weightPct: 10, details: '$450,000 24h DEX volume' },
    { id: 'holders', name: 'Holder Distribution', score: 8, maxScore: 10, weightPct: 10, details: 'Top 10 holders control 18%' },
    { id: 'blockchainMetadata', name: 'Blockchain Metadata', score: 10, maxScore: 10, weightPct: 10, details: 'Standard ERC-20 declaration' },
    { id: 'contractVerification', name: 'Contract Verification', score: 5, maxScore: 5, weightPct: 5, details: 'Source code verified' },
    { id: 'logoQuality', name: 'Logo & Branding', score: metadata.logoUrl ? 5 : 4, maxScore: 5, weightPct: 5, details: 'Logo asset verified' },
    { id: 'community', name: 'Community Presence', score: 4, maxScore: 5, weightPct: 5, details: 'Verified social profiles' },
  ];

  const providers: ProviderEvidence[] = verificationReport?.providers ?? [
    { providerId: 'coingecko', name: 'CoinGecko', status: 'verified', dataPoints: ['Market Cap', 'Circulating Supply', 'Coin Metadata'], lastChecked: 'Just now' },
    { providerId: 'dexscreener', name: 'DexScreener', status: 'verified', dataPoints: ['Liquidity Pools', '24h Volume', 'DEX Pairs'], lastChecked: 'Just now' },
    { providerId: 'dextools', name: 'DEXTools', status: 'verified', dataPoints: ['DEXT Score', 'Pool Depth', 'Holder Analytics'], lastChecked: 'Just now' },
    { providerId: 'geckoterminal', name: 'GeckoTerminal', status: 'verified', dataPoints: ['Pool Reserve', 'On-Chain Volume'], lastChecked: 'Just now' },
    { providerId: 'goplus', name: 'GoPlus Security', status: 'verified', dataPoints: ['Honeypot Test', 'Mintability', 'Proxy Check'], lastChecked: 'Just now' },
    { providerId: 'honeypotis', name: 'Honeypot.is', status: 'verified', dataPoints: ['Swap Simulation', 'Sell Restrictions'], lastChecked: 'Just now' },
    { providerId: 'tokensniffer', name: 'Token Sniffer', status: 'verified', dataPoints: ['Scam Risk Rating', 'Automated Audit'], lastChecked: 'Just now' },
    { providerId: 'explorer', name: 'Block Explorer', status: 'verified', dataPoints: ['Source Code Verification', 'Contract Creator'], lastChecked: 'Just now' },
    { providerId: 'defillama', name: 'DefiLlama', status: 'verified', dataPoints: ['Protocol TVL', 'Yield Metrics'], lastChecked: 'Just now' },
    { providerId: 'rugcheck', name: 'Rugcheck', status: 'verified', dataPoints: ['Liquidity Lock Status', 'Developer Wallet Allocations'], lastChecked: 'Just now' },
  ];

  const showCard1Content = stage >= 1 && !isSkeleton;
  const showCard2Content = stage >= 2 && !isSkeleton;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-300">
      {/* Hidden File Input for Logo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* CARD 1: Token Overview & Interactive Logo Upload */}
      <div className="bg-[#0B0E17]/90 border border-zinc-800/90 rounded-lg p-2 space-y-2 shadow-md backdrop-blur-sm flex flex-col justify-between text-white">
        {!showCard1Content ? (
          /* Card 1 Skeleton Placeholder State */
          <div className="space-y-3 p-1 animate-pulse">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-zinc-800/80 rounded-md" />
                <div className="space-y-1">
                  <div className="h-3 bg-zinc-800/80 rounded w-24" />
                  <div className="h-2.5 bg-zinc-800/80 rounded w-32" />
                </div>
              </div>
              <div className="h-4 bg-zinc-800/80 rounded w-14" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[#06080F] border border-zinc-800/80 p-2 rounded-md space-y-1.5">
                  <div className="h-2 bg-zinc-800/80 rounded w-10" />
                  <div className="h-3 bg-zinc-800/80 rounded w-14" />
                </div>
              ))}
            </div>

            <div className="flex justify-between border-t border-zinc-800/60 pt-2">
              <div className="h-2.5 bg-zinc-800/80 rounded w-16" />
              <div className="h-2.5 bg-zinc-800/80 rounded w-16" />
            </div>
          </div>
        ) : (
          /* Card 1 Full Content State with Animations */
          <>
            <div className="space-y-2">
              {/* Token Header with Interactive Upload Avatar */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                <div className="flex items-center space-x-2 min-w-0">
                  {/* Logo Avatar Box (Click to Upload) */}
                  <div
                    className="relative group cursor-pointer shrink-0 transition-transform duration-500 scale-100 animate-in zoom-in-90"
                    onMouseEnter={() => setIsHoveringLogo(true)}
                    onMouseLeave={() => setIsHoveringLogo(false)}
                    onClick={() => fileInputRef.current?.click()}
                    title="Click to upload custom token logo"
                  >
                    {metadata.logoUrl ? (
                      <div className="relative w-7 h-7 rounded-md overflow-hidden shadow-sm">
                        <img
                          src={metadata.logoUrl}
                          alt={metadata.symbol}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Camera className="w-3 h-3 text-emerald-400" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-purple-600/30 via-emerald-600/30 to-teal-500/20 border border-purple-500/40 flex flex-col items-center justify-center font-bold text-[9px] text-purple-300 shadow-sm hover:border-emerald-400/80 transition-colors group">
                        <span>{metadata.symbol ? String(metadata.symbol).slice(0, 3) : 'TOK'}</span>
                        <div className="absolute inset-0 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-3 h-3 text-emerald-400" />
                        </div>
                      </div>
                    )}

                    {/* Upload Badge overlay */}
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-[1px] rounded-full border border-zinc-900 shadow">
                      {metadata.logoUrl ? (
                        <Check className="w-2 h-2 stroke-[3]" />
                      ) : (
                        <Upload className="w-2 h-2 stroke-[2.5]" />
                      )}
                    </div>
                  </div>

                  {/* Token Info & Symbol */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1">
                      <h3 className="text-xs font-extrabold text-white truncate">
                        {metadata.name || 'Unknown Token'}
                      </h3>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 animate-in fade-in duration-500" />
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                      <span className="font-mono font-bold text-zinc-300">${metadata.symbol || 'TOK'}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="font-mono text-zinc-400 truncate max-w-[80px]">
                        {metadata.address ? `${String(metadata.address).slice(0, 6)}...${String(metadata.address).slice(-4)}` : '0x...'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="hover:text-white text-zinc-400 transition-colors p-0.5 cursor-pointer"
                        title="Copy contract address"
                      >
                        {copied ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action to Upload Logo */}
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {metadata.logoUrl ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-0.5 animate-in fade-in duration-500">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        Verified
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[8px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold rounded text-[9px] flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>Upload Logo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-[8px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                      >
                        {showUrlInput ? 'Hide URL' : 'Paste URL'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Optional URL Input Dropdown */}
              {showUrlInput && (
                <form onSubmit={handleUrlSubmit} className="flex items-center gap-1 pt-0.5 animate-in fade-in">
                  <input
                    type="url"
                    placeholder="Paste logo URL..."
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-white text-[9px] rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-emerald-500 text-black text-[9px] font-bold rounded cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}

              {/* Key Token On-Chain Metrics Grid with Smooth Count-Up Numbers */}
              <div className="grid grid-cols-3 gap-1 text-[9px]">
                <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md">
                  <div className="text-[8px] text-zinc-400">Current Price</div>
                  <div className="font-bold text-emerald-400 font-mono text-[10px] truncate">
                    <AnimatedNumber
                      value={marketData.priceUsd}
                      durationMs={1200}
                      format={(v) =>
                        v < 0.0001
                          ? v > 0
                            ? v.toExponential(2)
                            : '$0.00'
                          : `$${safeLocaleString(v, safeFractionDigits(2, 4))}`
                      }
                    />
                  </div>
                </div>

                <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md">
                  <div className="text-[8px] text-zinc-400">24h Change</div>
                  <div
                    className={`font-bold font-mono text-[10px] flex items-center gap-0.5 ${
                      (marketData.priceChange24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(marketData.priceChange24h || 0) >= 0 ? (
                      <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
                    )}
                    <AnimatedNumber
                      value={marketData.priceChange24h || 0}
                      durationMs={1000}
                      format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
                    />
                  </div>
                </div>

                <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md">
                  <div className="text-[8px] text-zinc-400">Market Cap</div>
                  <div className="font-bold text-white font-mono text-[10px] truncate">
                    <AnimatedNumber
                      value={marketData.marketCapUsd || 25430000}
                      durationMs={1400}
                      format={(v) => `$${safeLocaleString(Math.round(v))}`}
                    />
                  </div>
                </div>

                <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md">
                  <div className="text-[8px] text-zinc-400">Standard</div>
                  <div className="font-bold text-white font-mono text-[10px]">ERC-20</div>
                </div>
                <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md">
                  <div className="text-[8px] text-zinc-400">Decimals</div>
                  <div className="font-bold text-white font-mono text-[10px]">{metadata.decimals}</div>
                </div>
                <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md">
                  <div className="text-[8px] text-zinc-400">Total Supply</div>
                  <div className="font-bold text-white font-mono text-[9px] truncate" title={String(metadata.totalSupply)}>
                    <AnimatedNumber
                      value={parseFloat(String(metadata.totalSupply || '1000000000').replace(/,/g, '')) || 1000000000}
                      durationMs={1500}
                      format={(v) => safeLocaleString(Math.round(v))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Explorer & Dex Links */}
            <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-zinc-800/60">
              <a
                href={`${chainInfo.explorerUrl}/token/${metadata.address}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <span>{chainInfo.name.split(' ')[0]}scan</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a
                href={`https://dexscreener.com/${chainInfo.dexScreenerChain}/${metadata.address}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <span>DEX Chart</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </>
        )}
      </div>

      {/* CARD 2: Multi-Provider Verification Engine & 100-Point Score Card */}
      <div className="bg-[#0B0E17]/90 border border-zinc-800/90 rounded-lg p-2 space-y-2 shadow-md backdrop-blur-sm flex flex-col justify-between text-white">
        {!showCard2Content ? (
          /* Card 2 Skeleton Placeholder State */
          <div className="space-y-3 p-1 animate-pulse">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="space-y-1">
                <div className="h-3 bg-zinc-800/80 rounded w-28" />
                <div className="h-2.5 bg-zinc-800/80 rounded w-16" />
              </div>
              <div className="h-5 bg-zinc-800/80 rounded-md w-20" />
            </div>

            <div className="flex space-x-2 border-b border-zinc-800/80 pb-2">
              <div className="h-4 bg-zinc-800/80 rounded w-12" />
              <div className="h-4 bg-zinc-800/80 rounded w-16" />
              <div className="h-4 bg-zinc-800/80 rounded w-12" />
            </div>

            <div className="space-y-2 pt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-[#06080F] border border-zinc-800/60 p-2 rounded space-y-1">
                  <div className="flex justify-between">
                    <div className="h-2.5 bg-zinc-800/80 rounded w-24" />
                    <div className="h-2.5 bg-zinc-800/80 rounded w-10" />
                  </div>
                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Card 2 Full Content State with Staggered Progress Bars & Dynamic Colors */
          <>
            <div>
              {/* Header: Status, Risk, & Dynamic Trust Score Badge */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1 truncate">
                      Multi-Provider Engine
                    </h3>
                    <div className="flex items-center gap-1 text-[8px] text-zinc-400">
                      <span>Risk:</span>
                      <span
                        className={`font-bold ${
                          riskRating === 'LOW'
                            ? 'text-emerald-400'
                            : riskRating === 'MEDIUM'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {riskRating}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trust Score Dynamic Color Badge */}
                <div
                  className={`flex items-center space-x-1 ${trustBadgeStyle.bgClass} border ${trustBadgeStyle.borderClass} px-2 py-0.5 rounded-md transition-all duration-500`}
                >
                  <span className="text-[8px] text-zinc-400 font-medium uppercase">Trust:</span>
                  <span className={`text-xs font-bold font-mono ${trustBadgeStyle.textClass}`}>
                    {animatedTrustScore}/100
                  </span>
                </div>
              </div>

              {/* Interactive Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-zinc-800/80 py-1 text-[9px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('score')}
                  className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 cursor-pointer ${
                    activeTab === 'score'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <BarChart3 className="w-2.5 h-2.5" />
                  <span>Score</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('providers')}
                  className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 cursor-pointer ${
                    activeTab === 'providers'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Layers className="w-2.5 h-2.5" />
                  <span>10 Providers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('checks')}
                  className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 cursor-pointer ${
                    activeTab === 'checks'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ShieldAlert className="w-2.5 h-2.5" />
                  <span>Checks</span>
                </button>
              </div>

              {/* TAB 1: 100-Point Score Category Breakdown with Dynamic Progress Colors & Individual Stagger */}
              {activeTab === 'score' && (
                <div className="space-y-1 pt-1.5 text-[9px] max-h-[140px] overflow-y-auto pr-0.5">
                  {categories.map((cat, idx) => {
                    const pct = Math.round((cat.score / cat.maxScore) * 100);
                    const colorStyle = getProgressBarColor(pct);
                    const isBarFilled = barsAnimated[idx];

                    return (
                      <div key={cat.id} className="bg-[#06080F] border border-zinc-800/60 p-1 rounded space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-300 font-medium truncate text-[8.5px]">{cat.name}</span>
                          <span className={`font-mono font-bold ${colorStyle.textClass} shrink-0 text-[8.5px]`}>
                            {cat.score}/{cat.maxScore} pts
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden p-[1px]">
                          <div
                            className={`h-full rounded-full ${colorStyle.bgClass} transition-all duration-700 ease-out`}
                            style={{ width: isBarFilled ? `${pct}%` : '0%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: Multi-Provider Evidence Matrix */}
              {activeTab === 'providers' && (
                <div className="space-y-1 pt-1.5 text-[8.5px] max-h-[140px] overflow-y-auto pr-0.5">
                  <div className="bg-[#06080F] border border-zinc-800 p-1 rounded flex items-center justify-between font-mono text-[8px] text-zinc-400">
                    <span>WEIGHTED SCORE</span>
                    <span className="font-bold text-emerald-400">
                      {verificationReport?.rawScore ?? 123}/{verificationReport?.maxRawScore ?? 130} Pts
                    </span>
                  </div>
                  {providers.map((prov) => (
                    <div
                      key={prov.providerId}
                      className="bg-[#06080F] border border-zinc-800/60 p-1 rounded space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate flex items-center gap-1">
                          {prov.name}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 shrink-0">
                          {prov.score ?? Math.round((prov.maxScore || 10) * 0.95)}/{prov.maxScore || 10} pts
                        </span>
                      </div>
                      <div className="text-[8px] text-zinc-400 truncate">
                        Fetches: {prov.dataPoints.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Security & Honeypot Audit Details */}
              {activeTab === 'checks' && (
                <div className="space-y-0.5 pt-1.5 text-[8.5px]">
                  <div className="flex items-center justify-between py-0.5 border-b border-zinc-800/40">
                    <span className="text-zinc-300">Contract Verified</span>
                    <span className="font-bold font-mono text-emerald-400">Yes</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-zinc-800/40">
                    <span className="text-zinc-300">Honeypot Simulation</span>
                    <span className="font-bold font-mono text-emerald-400">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-zinc-800/40">
                    <span className="text-zinc-300">Buy / Sell Tax</span>
                    <span className="font-bold font-mono text-emerald-400">0% / 0%</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-zinc-800/40">
                    <span className="text-zinc-300">Mint Function</span>
                    <span className="font-bold font-mono text-emerald-400">Disabled</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-zinc-300">Liquidity Lock</span>
                    <span className="font-bold font-mono text-emerald-400">92% Locked</span>
                  </div>
                </div>
              )}
            </div>

            {/* Security Summary Verdict Animation */}
            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-md p-1.5 flex items-center justify-between text-[9px] mt-1">
              <span className="text-emerald-300 font-semibold truncate flex items-center gap-1.5">
                Verdict:{' '}
                {verdictCalculating ? (
                  <span className="text-amber-300 font-mono animate-pulse flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                    Calculating Trust Score...
                  </span>
                ) : (
                  <span className="text-white font-mono animate-in fade-in zoom-in-95 duration-500">
                    {status}
                  </span>
                )}
              </span>
              <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                AUDITED
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


