import { SubmittedToken } from '../types';

export interface Advertisement {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  actionText: string;
  iconType: 'flame' | 'rocket' | 'shield' | 'sparkles' | 'award' | 'megaphone' | 'coins';
  badgeBg?: string;
  gradient?: string;
  borderColor?: string;
  priority?: number;
  durationMs?: number;
  destinationTab?: string;
  externalUrl?: string;
  onClick?: () => void;
}

export function getDefaultAdvertisements(
  tokens: SubmittedToken[] = [],
  onNavigateAddToken?: () => void,
  onSelectToken?: (token: SubmittedToken) => void
): Advertisement[] {
  const latestToken = tokens.length > 0 ? tokens[0] : null;
  const tokenName = latestToken?.metadata?.name;
  const tokenSymbol = latestToken?.metadata?.symbol;
  const tokenChain =
    latestToken?.metadata?.blockchainName ||
    (latestToken?.metadata as any)?.chainName;

  const secondToken = tokens.length > 1 ? tokens[1] : null;
  const featuredName = secondToken?.metadata?.name;
  const featuredSymbol = secondToken?.metadata?.symbol;
  const featuredChain =
    secondToken?.metadata?.blockchainName ||
    (secondToken?.metadata as any)?.chainName;

  return [
    {
      id: 'notcoin-verified',
      tag: '🔥 NEW TOKEN VERIFIED',
      title: latestToken
        ? `${tokenName} (${tokenSymbol}) — Verified Smart Contract`
        : 'Verified Smart Contracts — Live DEX Pools',
      subtitle: latestToken
        ? `Automated audit passed • Live DEX Pool on ${tokenChain}`
        : 'Explore tokens fetched directly from Cloud Storage • Automated audits',
      actionText: 'Inspect Token →',
      iconType: 'flame',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      gradient: 'from-[#0d2a1f] via-[#091f17] to-[#06080e]',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/50',
      destinationTab: 'donate',
      onClick: () => {
        if (latestToken && onSelectToken) {
          onSelectToken(latestToken);
        } else if (onNavigateAddToken) {
          onNavigateAddToken();
        }
      },
    },
    {
      id: 'submit-earn',
      tag: '🪙 SUBMIT & EARN',
      title: 'Earn $TKC Rewards Instantly',
      subtitle: 'Get 10 REWARD points for every verified smart contract submission',
      actionText: 'Submit Now →',
      iconType: 'coins',
      badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      gradient: 'from-[#1a1c10] via-[#121611] to-[#06080e]',
      borderColor: 'border-amber-500/30 hover:border-amber-400/50',
      destinationTab: 'donate',
      onClick: onNavigateAddToken,
    },
    {
      id: 'security-audit',
      tag: '🛡️ tokencare security',
      title: 'Verify Smart Contracts Before Donating',
      subtitle: 'Automated honeypot detection, liquidity locks & DEX verification',
      actionText: 'Run Audit →',
      iconType: 'shield',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      gradient: 'from-[#0a2218] via-[#081a13] to-[#06080e]',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/50',
      destinationTab: 'donate',
      onClick: onNavigateAddToken,
    },
    {
      id: 'featured-token',
      tag: '⭐ FEATURED TOKEN',
      title: secondToken
        ? `${featuredName} (${featuredSymbol}) on ${featuredChain}`
        : 'Community Token Catalog — Verified Web3 Projects',
      subtitle: 'Verified compliant Web3 project accepting direct crypto donations',
      actionText: 'View Project →',
      iconType: 'sparkles',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      gradient: 'from-[#112d22] via-[#0b1f17] to-[#06080e]',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/50',
      destinationTab: 'tokens',
      onClick: () => {
        if (secondToken && onSelectToken) {
          onSelectToken(secondToken);
        } else if (onNavigateAddToken) {
          onNavigateAddToken();
        }
      },
    },
    {
      id: 'promote-project',
      tag: '🚀 PROMOTE YOUR TOKEN',
      title: 'Reach Verified TokenCare Donors',
      subtitle: 'Allow token & project owners to advertise compliant Web3 projects',
      actionText: 'Advertise →',
      iconType: 'rocket',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      gradient: 'from-[#0e271d] via-[#0a1e16] to-[#06080e]',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/50',
      destinationTab: 'donate',
      onClick: onNavigateAddToken,
    },
    {
      id: 'earn-rewards',
      tag: '🏆 EARN MORE REWARDS',
      title: 'Support Vetted Crypto Philanthropy',
      subtitle: 'Donate safely in ETH, MATIC, SOL, or USDT & claim bonus rewards',
      actionText: 'Donate Now →',
      iconType: 'award',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      gradient: 'from-[#102d21] via-[#0b1f17] to-[#06080e]',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/50',
      destinationTab: 'tokens',
      onClick: onNavigateAddToken,
    },
    {
      id: 'tokencare-announcement',
      tag: '📢 TOKENCARE ANNOUNCEMENT',
      title: 'Multi-Chain Security Expansion',
      subtitle: 'TokenCare now verifies contracts across TON, XRPL, SOL, TRON & EVM!',
      actionText: 'Read More →',
      iconType: 'megaphone',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      gradient: 'from-[#0d2a1f] via-[#091f17] to-[#06080e]',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/50',
      destinationTab: 'settings',
      onClick: onNavigateAddToken,
    },
  ];
}
