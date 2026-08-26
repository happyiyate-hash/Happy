import React from 'react';
import { ExternalLink, Copy, Check, ShieldCheck, Flame, Coins, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { SubmittedToken } from '../types';
import { SUPPORTED_CHAINS, REWARD_RATE_USD, getChainInfo } from '../constants/chains';
import { formatSmartCurrency, formatSmartNumber, safeLocaleString, safeFractionDigits } from '../utils/numberFormatting';

interface TokenAnalysisCardProps {
  token: SubmittedToken;
  isNewSubmission?: boolean;
}

export const TokenAnalysisCard: React.FC<TokenAnalysisCardProps> = ({
  token,
  isNewSubmission = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const chainInfo = SUPPORTED_CHAINS[token.chainId] || getChainInfo(token.chainId);
  const chainDisplayName =
    token.metadata?.blockchainName ||
    (token.metadata as any)?.blockchain_name ||
    (token.metadata as any)?.blockchain ||
    token.metadata?.chainName ||
    token.metadata?.network ||
    chainInfo?.name ||
    token.chainId;

  const handleCopy = () => {
    navigator.clipboard.writeText(token.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPositive = token.marketData.priceChange24h >= 0;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-sm">
      {/* Newly Earned Reward Alert Banner */}
      {isNewSubmission && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-blue-950/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold shrink-0">
              🪙
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                Submission Verified & Reward Distributed!
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  + {token.rewardEarnedTokens} REWARD
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Earned <span className="font-semibold text-amber-300">{token.rewardEarnedTokens} REWARD</span> ($
                {(token.rewardEarnedTokens * REWARD_RATE_USD).toFixed(3)} USD at 0.1¢ / token rate). Added to unclaimed balance!
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-400 shrink-0">
            <div className="font-mono text-amber-400 font-bold">1 REWARD = 0.1¢ ($0.001)</div>
            <div>Rate Fixed Guarantee</div>
          </div>
        </div>
      )}

      {/* Token Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl font-bold text-blue-400 shadow-inner">
            {String(token.metadata?.symbol || 'TOK').substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-zinc-100">{token.metadata?.name || 'Token'}</h1>
              <span className="text-sm font-semibold text-zinc-400 font-mono">
                ${token.metadata?.symbol || 'TOK'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 font-medium">
                {chainInfo?.icon || '⛓️'} {chainDisplayName}
              </span>
            </div>

            <div className="flex items-center space-x-2 mt-1.5 text-xs font-mono text-zinc-400">
              <span>{token.address}</span>
              <button
                onClick={handleCopy}
                className="hover:text-zinc-200 transition-colors cursor-pointer"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={`${chainInfo?.explorerUrl || 'https://blockscan.com'}/token/${token.address}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-400 flex items-center space-x-0.5 transition-colors"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Price & Change Block */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 flex items-center space-x-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Live Price (USD)</div>
            <div className="text-2xl font-bold text-zinc-100 font-mono">
              ${token.marketData.priceUsd < 0.0001
                ? (token.marketData.priceUsd > 0 ? token.marketData.priceUsd.toExponential(4) : '0.00')
                : safeLocaleString(token.marketData.priceUsd, safeFractionDigits(2, 6))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">24h Change</div>
            <div
              className={`text-sm font-bold flex items-center justify-end space-x-1 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isPositive ? '+' : ''}{(token.marketData.priceChange24h || 0).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Smart Contract ERC-20 Readouts (Real Ethers.js) */}
      <div>
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Ethers.js Blockchain RPC Readouts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl">
            <div className="text-xs text-zinc-400">Decimals</div>
            <div className="text-lg font-bold text-zinc-200 font-mono mt-0.5">{token.metadata.decimals}</div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl">
            <div className="text-xs text-zinc-400">Total Supply (ERC20)</div>
            <div className="text-sm font-bold text-zinc-200 font-mono mt-0.5 truncate" title={token.metadata.totalSupply}>
              {safeLocaleString(token.metadata.totalSupply, safeFractionDigits(0, 0))}
            </div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl">
            <div className="text-xs text-zinc-400">Ownership Status</div>
            <div className="text-sm font-semibold mt-0.5 flex items-center space-x-1">
              {token.metadata.isRenounced ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Renounced
                </span>
              ) : (
                <span className="text-amber-400">Active Owner</span>
              )}
            </div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl">
            <div className="text-xs text-zinc-400">Reward Rate</div>
            <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
              0.1 Cent ($0.001)
            </div>
          </div>
        </div>
      </div>

      {/* Market Data Grid (DexScreener & CoinGecko) */}
      <div>
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" /> Market Data & Liquidity Pools
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-950/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400">Market Cap / FDV</div>
            <div className="text-base font-bold text-zinc-200 font-mono mt-0.5">
              {formatSmartCurrency(token.marketData.marketCapUsd)}
            </div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400">24h Trading Volume</div>
            <div className="text-base font-bold text-zinc-200 font-mono mt-0.5">
              {formatSmartCurrency(token.marketData.volume24h)}
            </div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400">DEX Liquidity USD</div>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {formatSmartCurrency(token.marketData.liquidityUsd)}
            </div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400">DEX Protocol</div>
            <div className="text-base font-bold text-blue-400 mt-0.5 flex items-center justify-between">
              <span>{token.marketData.dexName || 'UNISWAP'}</span>
              {token.marketData.pairUrl && (
                <a
                  href={token.marketData.pairUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CoinGecko Token Supply Stats */}
      {token.marketData.circulatingSupply && (
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            CoinGecko Token Supply Overview:
          </div>
          <div className="flex flex-col sm:flex-row justify-between text-xs text-zinc-300 gap-2">
            <div>
              <span className="text-zinc-400">Circulating Supply: </span>
              <span className="font-mono font-bold text-zinc-100">
                {safeLocaleString(token.marketData.circulatingSupply)} {token.metadata.symbol}
              </span>
            </div>
            {token.marketData.totalSupplyCG && (
              <div>
                <span className="text-zinc-400">CoinGecko Total Supply: </span>
                <span className="font-mono font-bold text-zinc-100">
                  {safeLocaleString(token.marketData.totalSupplyCG)} {token.metadata.symbol}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
