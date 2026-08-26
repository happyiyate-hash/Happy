import { VerificationReport } from './services/verificationEngine';

export type ChainId = string;
export type LogoStatus = 'checking' | 'valid' | 'invalid';

export interface ChainInfo {
  id: ChainId;
  name: string;
  symbol: string;
  icon: string;
  rpcUrl: string;
  explorerUrl: string;
  coingeckoPlatform: string;
  dexScreenerChain: string;
}

export interface ERC20Metadata {
  address: string;
  chainId: ChainId;
  blockchainType?: string;
  blockchain_type?: string;
  blockchainName?: string;
  blockchain_name?: string;
  tokenStandard?: string;
  token_standard?: string;
  asset_identifier_type?: string;
  chainName?: string;
  network?: string;
  chainSymbol?: string;
  chainLogoUrl?: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string; // Formatted total supply
  rawTotalSupply?: string;
  ownerAddress?: string;
  isRenounced?: boolean;
  logoUrl?: string;
}

export interface TokenDiscovery {
  address: string;
  name: string;
  symbol: string;
  decimals?: number;
  blockchainType: string;
  blockchainName: string;
  chainId: string;
  tokenStandard?: string;
  asset_identifier_type?: string;
  logoUrl?: string;
  source: string;
  totalSupply?: string;
  marketData?: Partial<MarketData>;
}

export interface MarketData {
  priceUsd: number;
  priceNative: number;
  priceChange24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCapUsd: number;
  fdvUsd: number;
  pairAddress?: string;
  dexName?: string;
  pairUrl?: string;
  circulatingSupply?: number;
  totalSupplyCG?: number;
  maxSupplyCG?: number;
}

export interface SafetyAnalysis {
  score: number; // 0 to 100
  rating: 'SAFE' | 'CAUTION' | 'HIGH_RISK';
  recommendation: string;
  buyTaxPct: number;
  sellTaxPct: number;
  isHoneypot: boolean;
  isMintable: boolean;
  isProxy: boolean;
  isOpenSource: boolean;
  isOwnershipRenounced: boolean;
  isLiquidityLocked: boolean;
  liquidityLockedPct: number;
  top10HoldersPct: number;
  holdersCount: number;
  pairAgeDays: number;
  warnings: string[];
  flags: {
    type: 'pass' | 'warn' | 'fail';
    title: string;
    description: string;
  }[];
}

export interface SubmittedToken {
  id: string;
  address: string;
  chainId: ChainId;
  metadata: ERC20Metadata;
  marketData: MarketData;
  safety: SafetyAnalysis;
  submittedAt: string;
  submittedBy: string;
  rewardEarnedTokens: number; // e.g., 10 tokens
  rewardEarnedUsd: number; // e.g., 10 * 0.001 = $0.01 (0.1 cent rate)
  upvotes: number;
  verified: boolean;
  verificationReport?: VerificationReport;
}

export interface RewardTransaction {
  id: string;
  type: 'SUBMISSION_BONUS' | 'SAFETY_BONUS' | 'FIRST_SUBMISSION' | 'CLAIM';
  amountTokens: number;
  amountUsd: number; // 1 Token = $0.001 (0.1 cent)
  tokenAddress?: string;
  tokenSymbol?: string;
  timestamp: string;
  txHash?: string;
  status: 'COMPLETED' | 'PENDING';
}

export interface UserRewardWallet {
  totalTokens: number;
  totalUsd: number; // calculated at $0.001 per token
  claimedTokens: number;
  claimedUsd: number;
  unclaimedTokens: number;
  unclaimedUsd: number;
  totalSubmissions: number;
  walletAddress?: string;
  isConnected: boolean;
  transactions: RewardTransaction[];
}
