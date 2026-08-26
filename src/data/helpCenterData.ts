export interface HelpArticle {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  readTime: string;
  tags: string[];
  content: {
    intro: string;
    sections: {
      heading: string;
      body: string[];
      tip?: string;
      warning?: string;
    }[];
    conclusion?: string;
  };
  relatedArticleIds?: string[];
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
  articles: HelpArticle[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the fundamentals of TokenCare, account setup, and platform navigation.',
    iconName: 'Sparkles',
    color: '#00E575',
    articles: [
      {
        id: 'what-is-tokencare',
        categoryId: 'getting-started',
        title: 'What is TokenCare?',
        summary: 'An introduction to TokenCare, our mission, and the decentralized token donation ecosystem.',
        readTime: '3 min read',
        tags: ['intro', 'overview', 'mission', 'about', 'basics'],
        content: {
          intro: 'TokenCare is a non-custodial Web3 token discovery, safety inspection, and donation platform. We empower token communities, creators, and charitable causes to accept ERC-20 token donations transparently across 37+ EVM-compatible blockchains.',
          sections: [
            {
              heading: 'Core Pillars of TokenCare',
              body: [
                'Automated Security Inspections: Every token submitted to TokenCare is evaluated for honeypots, malicious transfer taxes, blacklist functions, and minting vulnerabilities.',
                'Multi-Chain EVM Support: Submit and inspect tokens from Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, Avalanche, and 30+ other EVM networks.',
                'Community Reward Engine: Contributors who inspect, verify, and register verified tokens earn REWARD utility tokens directly to their wallet.'
              ],
              tip: 'TokenCare never takes custody of your private keys or tokens. All donations flow directly through verified smart contracts to destination addresses.'
            },
            {
              heading: 'Who is TokenCare for?',
              body: [
                'Web3 Donors: Safely donate tokens knowing contract authenticity and real-time market liquidity.',
                'Token Projects: Get your ERC-20 token verified, audited, and listed on the TokenCare Marketplace directory.',
                'Community Curators: Earn rewards by discovering unverified tokens and adding their audited metadata to our public registry.'
              ]
            }
          ],
          conclusion: 'TokenCare bridges the gap between decentralized finance and philanthropic giving with cryptographic security.'
        },
        relatedArticleIds: ['how-does-tokencare-work', 'creating-an-account', 'understanding-the-overview-page']
      },
      {
        id: 'how-does-tokencare-work',
        categoryId: 'getting-started',
        title: 'How does TokenCare work?',
        summary: 'Step-by-step breakdown of contract verification, token inspection, and reward distribution.',
        readTime: '4 min read',
        tags: ['workflow', 'how-it-works', 'process', 'steps'],
        content: {
          intro: 'TokenCare combines direct on-chain JSON-RPC queries, DexScreener/CoinGecko market aggregators, and automated bytecode heuristics to audit ERC-20 tokens within seconds.',
          sections: [
            {
              heading: 'The 4-Step Token Lifecycle',
              body: [
                'Step 1 — Contract Submission: Enter any ERC-20 contract address on any supported EVM network.',
                'Step 2 — Deep Inspection: TokenCare queries the blockchain for decimals, total supply, owner privileges, buy/sell taxes, and honeypot indicators.',
                'Step 3 — Logo & Metadata Verification: The platform extracts and verifies official token logos, symbol conformity, and co-founder/social links.',
                'Step 4 — Registry & Reward: Once confirmed, the token is added to the global directory and the contributor is credited with REWARD tokens.'
              ],
              tip: 'You can track real-time blockchain confirmation steps in the Add Token panel.'
            }
          ]
        },
        relatedArticleIds: ['what-is-tokencare', 'searching-for-tokens', 'how-token-safety-checks-work']
      },
      {
        id: 'creating-an-account',
        categoryId: 'getting-started',
        title: 'Creating an account',
        summary: 'Guide to registering for TokenCare via email, social auth, or Web3 wallet.',
        readTime: '2 min read',
        tags: ['account', 'registration', 'sign up', 'register'],
        content: {
          intro: 'Creating a TokenCare account takes less than 30 seconds. An account allows you to track verified submissions, save payout addresses, and accumulate reward balances.',
          sections: [
            {
              heading: 'Registration Steps',
              body: [
                '1. Open TokenCare and click "Get Started" or "Sign In".',
                '2. Choose your preferred registration method: Email + Password or Google OAuth.',
                '3. If using email, verify your address via the confirmation link sent to your inbox.',
                '4. Set up an optional display name and avatar in Settings.'
              ],
              tip: 'We recommend immediately enabling Two-Factor Authentication (2FA) in Settings > 2FA Security.'
            }
          ]
        },
        relatedArticleIds: ['logging-in', 'account-verification', 'two-factor-authentication']
      },
      {
        id: 'logging-in',
        categoryId: 'getting-started',
        title: 'Logging in',
        summary: 'How to sign in to TokenCare across devices using email or social authentication.',
        readTime: '2 min read',
        tags: ['login', 'signin', 'auth', 'access'],
        content: {
          intro: 'TokenCare provides fast and secure sign-in across desktop and mobile browsers.',
          sections: [
            {
              heading: 'Sign-in Options',
              body: [
                'Email and Password: Enter your registered email address and secure password.',
                'Google One-Tap: Fast single sign-on using your linked Google account.',
                'Two-Factor Code: If 2FA is active on your account, you will be prompted to enter the 6-digit TOTP code from your authenticator app.'
              ]
            },
            {
              heading: 'Persistent Sessions',
              body: [
                'TokenCare caches your authenticated session locally, allowing seamless access even during temporary network interruptions or offline periods.'
              ]
            }
          ]
        },
        relatedArticleIds: ['creating-an-account', 'forgot-password', 'login-problems']
      },
      {
        id: 'account-verification',
        categoryId: 'getting-started',
        title: 'Account verification',
        summary: 'Email confirmation, security tiers, and wallet binding requirements.',
        readTime: '2 min read',
        tags: ['verification', 'email', 'kyc', 'tiers', 'security'],
        content: {
          intro: 'TokenCare uses a progressive security verification model to protect reward distributions against sybil attacks and bot networks.',
          sections: [
            {
              heading: 'Account Verification Levels',
              body: [
                'Tier 1 (Email Verified): Confirms your email inbox; allows searching, inspecting, and submitting tokens.',
                'Tier 2 (2FA Active): Enables TOTP authenticator protection for sensitive settings changes and withdrawals.',
                'Tier 3 (Payout Wallet Bound): Binds a verified Polygon EVM address for automated reward withdrawals.'
              ]
            }
          ]
        },
        relatedArticleIds: ['creating-an-account', 'payout-wallet', 'two-factor-authentication']
      },
      {
        id: 'navigating-tokencare',
        categoryId: 'getting-started',
        title: 'Navigating TokenCare',
        summary: 'Explore views, navigation tabs, mobile bottom navigation, and quick shortcuts.',
        readTime: '3 min read',
        tags: ['navigation', 'ui', 'tabs', 'desktop', 'mobile', 'shortcuts'],
        content: {
          intro: 'TokenCare provides an optimized interface tailored for both desktop workstations and mobile touch devices.',
          sections: [
            {
              heading: 'Main Navigation Tabs',
              body: [
                'Overview: Real-time dashboard showing your verified tokens, market stats, and quick actions.',
                'Explore: Comprehensive directory of all verified tokens with live price charts and liquidity.',
                'Donate: The primary submission and inspection console for checking contract addresses and honeypots.',
                'Tokens: Your personal catalog of submitted tokens, reward metrics, and approval statuses.',
                'Settings: Profile customization, 2FA security, currency display, and help desk.'
              ],
              tip: 'On mobile, use the prominent green center button on the bottom navigation bar for quick token inspections.'
            }
          ]
        },
        relatedArticleIds: ['understanding-the-overview-page', 'searching-for-tokens']
      },
      {
        id: 'understanding-the-overview-page',
        categoryId: 'getting-started',
        title: 'Understanding the Overview page',
        summary: 'Guide to the main dashboard cards, verified metrics, reward summary, and recent activity.',
        readTime: '3 min read',
        tags: ['overview', 'dashboard', 'metrics', 'stats', 'balance'],
        content: {
          intro: 'The Overview page is your central command center in TokenCare, giving you an instantaneous snapshot of platform activity and your account.',
          sections: [
            {
              heading: 'Key Overview Components',
              body: [
                'Balance Card: Displays your total accumulated REWARD tokens and their current estimated fiat equivalent in your chosen currency.',
                'Verification Metrics: Real-time stats showing the total number of verified tokens in your portfolio and overall security pass rates.',
                'Quick Action Shortcuts: Instant one-tap access to Add Token, Explore Directory, Withdraw Rewards, and Support.',
                'Recent Activity Feed: Chronological log of recent token inspections, on-chain donations, and reward payouts.'
              ]
            }
          ]
        },
        relatedArticleIds: ['navigating-tokencare', 'understanding-reward-balance', 'what-tokencare-rewards-are']
      }
    ]
  },
  {
    id: 'tokens',
    title: 'Tokens',
    description: 'Learn about token verification, honeypot safety checks, networks, and price tracking.',
    iconName: 'Coins',
    color: '#34D399',
    articles: [
      {
        id: 'searching-for-tokens',
        categoryId: 'tokens',
        title: 'Searching for tokens',
        summary: 'Find tokens by contract address, ticker symbol, or token name in TokenCare.',
        readTime: '2 min read',
        tags: ['search', 'contract', 'find', 'explore'],
        content: {
          intro: 'You can search for tokens across any of the 37 supported EVM networks in two simple ways.',
          sections: [
            {
              heading: '1. Search by Contract Address (Recommended)',
              body: [
                'Paste the 0x contract address into the search input on the Add Token screen. TokenCare will auto-detect the matching chain and pull live metadata.'
              ]
            },
            {
              heading: '2. Search in Explore Marketplace',
              body: [
                'Go to the Explore tab and type the token name (e.g. "Uniswap") or symbol (e.g. "UNI"). Filter by chain, market cap, or verified badge.'
              ],
              tip: 'Always verify the contract address against official project documentation (e.g. CoinGecko or project website) to avoid imposter tokens.'
            }
          ]
        },
        relatedArticleIds: ['adding-tokens', 'what-token-verification-means', 'why-a-token-may-not-appear']
      },
      {
        id: 'adding-tokens',
        categoryId: 'tokens',
        title: 'Adding tokens',
        summary: 'How to submit a new ERC-20 contract address to TokenCare and earn REWARD tokens.',
        readTime: '3 min read',
        tags: ['add-token', 'submit', 'contract', 'curate'],
        content: {
          intro: 'Adding a token to TokenCare verifies its authenticity and registers it in the public community directory.',
          sections: [
            {
              heading: 'Step-by-Step Submission',
              body: [
                '1. Open the "Donate" or "Add Token" tab.',
                '2. Select the blockchain network where the token resides (e.g. Polygon, Ethereum, Arbitrum, Base).',
                '3. Paste the 42-character 0x ERC-20 contract address.',
                '4. Click "Inspect Contract" to run the automated safety heuristics.',
                '5. Verify the logo and metadata, then click "Save & Register Token" to earn your reward.'
              ]
            }
          ]
        },
        relatedArticleIds: ['searching-for-tokens', 'how-token-safety-checks-work', 'what-tokencare-rewards-are']
      },
      {
        id: 'understanding-verified-tokens',
        categoryId: 'tokens',
        title: 'Understanding verified tokens',
        summary: 'What the green verified shield badge indicates and how audited tokens are categorized.',
        readTime: '3 min read',
        tags: ['verified', 'shield', 'badge', 'trust'],
        content: {
          intro: 'A verified token on TokenCare has completed comprehensive smart contract audits and liquidity validation.',
          sections: [
            {
              heading: 'Verification Indicators',
              body: [
                'Green Shield Badge: Confirms verified source code, zero malicious honeypot mechanics, and verified owner privileges.',
                'High Trust Score: Reflects contract longevity, deep decentralized exchange liquidity, and verified community socials.',
                'Clear Tax Disclosure: Shows exact buy and sell tax percentages (0% for standard utility tokens).'
              ]
            }
          ]
        },
        relatedArticleIds: ['what-token-verification-means', 'how-token-safety-checks-work']
      },
      {
        id: 'what-token-verification-means',
        categoryId: 'tokens',
        title: 'What token verification means',
        summary: 'Detailed explanation of what is verified and what is not financial advice.',
        readTime: '3 min read',
        tags: ['verification', 'guarantee', 'disclaimer', 'security'],
        content: {
          intro: 'Token verification is a cryptographic and bytecode safety check designed to protect users against common on-chain scams.',
          sections: [
            {
              heading: 'What Verification Confirms',
              body: [
                'Standard ERC-20 compliance (transfer, balanceOf, approve methods).',
                'Absence of hidden transfer fees, transfer blocks, or malicious proxy backdoors.',
                'Match between token symbol, name, and registered blockchain metadata.'
              ],
              warning: 'Verification does NOT guarantee future price performance or protect against general market volatility.'
            }
          ]
        },
        relatedArticleIds: ['understanding-verified-tokens', 'how-token-safety-checks-work']
      },
      {
        id: 'how-token-safety-checks-work',
        categoryId: 'tokens',
        title: 'How token safety checks work',
        summary: 'Technical breakdown of our automated static analysis and RPC honeypot engine.',
        readTime: '4 min read',
        tags: ['audit', 'static-analysis', 'honeypot', 'engine', 'checks'],
        content: {
          intro: 'TokenCare runs a multi-layered verification pipeline combining on-chain bytecode analysis, DEX simulation, and decentralized metadata resolution.',
          sections: [
            {
              heading: 'The Verification Pipeline',
              body: [
                '1. Bytecode Extraction: Direct RPC call to eth_getCode to ensure the address is a deployed smart contract.',
                '2. ERC-20 Standard Interface Check: Validates name(), symbol(), decimals(), and totalSupply() response formats.',
                '3. Honeypot & Tax Simulation: Simulates buy/sell transactions via router contract interfaces to identify hidden slippage or transfer blocks.',
                '4. Owner Privilege Audit: Checks for dangerous administrative powers (e.g. pause transfers, unlimited minting, blacklist functions).'
              ]
            }
          ]
        },
        relatedArticleIds: ['what-token-verification-means', 'token-networks']
      },
      {
        id: 'token-networks',
        categoryId: 'tokens',
        title: 'Token networks',
        summary: 'Overview of supported Layer-1 and Layer-2 blockchains (Polygon, Ethereum, Arbitrum, Base, etc.).',
        readTime: '3 min read',
        tags: ['networks', 'chains', 'polygon', 'ethereum', 'layer2', 'evm'],
        content: {
          intro: 'TokenCare connects to 37+ EVM networks, ranging from Layer 1 base chains to ultra-fast Layer 2 rollups.',
          sections: [
            {
              heading: 'Popular Supported Networks',
              body: [
                'Polygon PoS (Chain ID 137): Default network for low-cost token donations and REWARD payouts.',
                'Ethereum Mainnet (Chain ID 1): The foundational smart contract blockchain with the largest liquidity.',
                'Arbitrum One & Optimism: High-performance Layer 2 rollups with minimal transaction fees.',
                'Base: Coinbase’s Layer 2 network optimized for decentralized consumer applications.',
                'BNB Chain, Avalanche C-Chain, Fantom, Linea, Scroll, Blast, and more.'
              ]
            }
          ]
        },
        relatedArticleIds: ['how-token-safety-checks-work', 'token-prices']
      },
      {
        id: 'token-prices',
        categoryId: 'tokens',
        title: 'Token prices',
        summary: 'Real-time market price feeds, liquidity pools, and conversion rates in USD and local currencies.',
        readTime: '3 min read',
        tags: ['prices', 'dexscreener', 'coingecko', 'liquidity', 'quotes'],
        content: {
          intro: 'TokenCare aggregates live token pricing from decentralized liquidity pools (Uniswap, QuickSwap, PancakeSwap) and major market data providers.',
          sections: [
            {
              heading: 'Price Calculation Method',
              body: [
                'Direct DEX Pool Rates: Real-time price derived from the highest-liquidity pair (e.g. TOKEN/USDC or TOKEN/WETH).',
                'Aggregated 24h Volume & Price Change: Live statistics updating automatically every 30 seconds.',
                'Currency Conversion: Convert USD rates into EUR, GBP, JPY, CAD, or AUD via the Settings > Currency selector.'
              ]
            }
          ]
        },
        relatedArticleIds: ['currency-display-settings', 'understanding-token-details']
      },
      {
        id: 'why-a-token-may-not-appear',
        categoryId: 'tokens',
        title: 'Why a token may not appear',
        summary: 'Troubleshooting unlisted contracts, new deployments, or unsupported chains.',
        readTime: '3 min read',
        tags: ['not-found', 'error', 'troubleshoot', 'new-token', 'missing'],
        content: {
          intro: 'If you cannot locate a token on TokenCare, review these common reasons and quick resolutions.',
          sections: [
            {
              heading: 'Common Causes',
              body: [
                'Incorrect Network: Ensure you have selected the blockchain where the token was actually deployed (e.g. Arbitrum vs Ethereum Mainnet).',
                'Brand New Deployment: If a contract was deployed minutes ago, RPC indexers may need 1–2 minutes to index the contract code.',
                'Non-EVM Blockchain: TokenCare currently supports EVM chains. Solana, Bitcoin, and Cosmos tokens cannot be inspected directly.',
                'Proxy Contract: Some upgradeable proxies require checking the implementation address.'
              ],
              tip: 'You can paste the exact 0x contract address into the "Add Token" search box to force a fresh blockchain lookup.'
            }
          ]
        },
        relatedArticleIds: ['searching-for-tokens', 'token-networks']
      },
      {
        id: 'understanding-token-details',
        categoryId: 'tokens',
        title: 'Understanding token details',
        summary: 'How to read contract specifications, liquidity pools, supply metrics, and creator details.',
        readTime: '3 min read',
        tags: ['details', 'specs', 'liquidity', 'supply', 'market-cap'],
        content: {
          intro: 'The Token Details view provides in-depth metrics regarding contract structure, circulating supply, and market depth.',
          sections: [
            {
              heading: 'Key Metrics Breakdown',
              body: [
                'Total Supply & Decimals: Indicates standard unit divisibility (typically 18 decimals) and total minted volume.',
                'Liquidity Depth: The total dollar volume locked in decentralized liquidity pools to support slippage-free donations.',
                'Contract Explorer Link: Direct one-tap jump to the verified block explorer (Etherscan, Polygonscan, etc.) to review raw source code.'
              ]
            }
          ]
        },
        relatedArticleIds: ['token-prices', 'understanding-verified-tokens']
      }
    ]
  },
  {
    id: 'rewards',
    title: 'Rewards',
    description: 'Understand how to earn REWARD tokens, compute balances, and withdraw to Polygon.',
    iconName: 'Sparkles',
    color: '#F59E0B',
    articles: [
      {
        id: 'what-tokencare-rewards-are',
        categoryId: 'rewards',
        title: 'What TokenCare rewards are',
        summary: 'Everything you need to know about the TokenCare community incentive token.',
        readTime: '3 min read',
        tags: ['rewards', 'earn', 'incentive', 'utility'],
        content: {
          intro: 'TokenCare REWARD is an on-chain utility token created to compensate community members for curating, auditing, and adding legitimate tokens to the public donation directory.',
          sections: [
            {
              heading: 'How to Earn REWARD',
              body: [
                'Adding a New Verified Token: Receive 15 to 25 REWARD tokens per verified unique ERC-20 contract.',
                'Verifying Token Logos: Receive bonus REWARD tokens for uploading high-resolution transparent logos.',
                'Community Auditing: Receive rewards when other users donate using your listed token profile.'
              ]
            }
          ]
        },
        relatedArticleIds: ['how-rewards-are-calculated', 'withdrawing-rewards']
      },
      {
        id: 'how-rewards-are-calculated',
        categoryId: 'rewards',
        title: 'How rewards are calculated',
        summary: 'Formula, reward rates, conversion multipliers, and pending balance status.',
        readTime: '2 min read',
        tags: ['balance', 'calculation', 'formula', 'rate'],
        content: {
          intro: 'Your reward balance represents the sum of all earned token incentives minus completed withdrawals.',
          sections: [
            {
              heading: 'Calculation Formula',
              body: [
                'Total Unclaimed Balance = (Verified Tokens × Base Reward Rate) + (Logo Bonuses) - (Processed Withdrawals)',
                'Current Reward Rate: 1 REWARD ≈ $0.05 USD baseline reference value.'
              ]
            }
          ]
        },
        relatedArticleIds: ['what-tokencare-rewards-are', 'understanding-reward-balance']
      },
      {
        id: 'understanding-reward-balance',
        categoryId: 'rewards',
        title: 'Understanding reward balance',
        summary: 'How unclaimed balance, pending claims, and lifetime earnings are tracked.',
        readTime: '2 min read',
        tags: ['reward-balance', 'unclaimed', 'lifetime', 'pending'],
        content: {
          intro: 'TokenCare clearly separates your available unclaimed balance from pending transactions and lifetime cumulative earnings.',
          sections: [
            {
              heading: 'Balance Types',
              body: [
                'Unclaimed Balance: The liquid amount available right now to withdraw to your Polygon wallet.',
                'Pending Balance: Tokens awarded for submissions currently completing validator confirmations.',
                'Lifetime Earnings: The total historical reward points awarded to your account since registration.'
              ]
            }
          ]
        },
        relatedArticleIds: ['how-rewards-are-calculated', 'reward-history']
      },
      {
        id: 'reward-history',
        categoryId: 'rewards',
        title: 'Reward history',
        summary: 'Reviewing past reward distributions, bonus credits, and claim timestamps.',
        readTime: '2 min read',
        tags: ['history', 'logs', 'rewards-log', 'credits'],
        content: {
          intro: 'Every reward distribution is logged cryptographically and tied to the specific token contract submission.',
          sections: [
            {
              heading: 'Viewing Your History',
              body: [
                '1. Open the "Payouts & Server" or "Dashboard" tab.',
                '2. Scroll to the Reward Activity table.',
                '3. Each row lists the timestamp, token symbol submitted, reward amount credited, and current claim status.'
              ]
            }
          ]
        },
        relatedArticleIds: ['understanding-reward-balance', 'withdrawing-rewards']
      },
      {
        id: 'withdrawing-rewards',
        categoryId: 'rewards',
        title: 'Withdrawing rewards',
        summary: 'Step-by-step guide to requesting and processing a payout on the Polygon network.',
        readTime: '3 min read',
        tags: ['withdraw', 'payout', 'polygon', 'transfer', 'claim'],
        content: {
          intro: 'Withdrawing your earned REWARD tokens is fast and dispatched to your saved Polygon address.',
          sections: [
            {
              heading: 'Withdrawal Instructions',
              body: [
                '1. Go to the "Payouts & Server" tab from the sidebar or mobile menu.',
                '2. Ensure your Polygon EVM payout address is configured in Settings.',
                '3. Enter the amount of REWARD tokens you wish to withdraw (Minimum: 10 REWARD).',
                '4. Click "Request Payout". Your transaction will be submitted to the payout relayer queue.'
              ],
              tip: 'Withdrawals are processed on Polygon PoS to guarantee near-zero gas fees for recipients.'
            }
          ]
        },
        relatedArticleIds: ['payout-wallet', 'why-a-payout-may-be-pending']
      },
      {
        id: 'payout-wallet',
        categoryId: 'rewards',
        title: 'Payout wallet',
        summary: 'Setting up and safeguarding your designated recipient address on Polygon.',
        readTime: '2 min read',
        tags: ['payout-wallet', 'address', 'polygon', 'metamask', 'destination'],
        content: {
          intro: 'Your payout wallet is the standard EVM address (e.g. from MetaMask, Coinbase Wallet, or Trust Wallet) where TokenCare transmits your claimed REWARD tokens.',
          sections: [
            {
              heading: 'Configuring Your Payout Wallet',
              body: [
                '1. Navigate to Settings > Saved Payout Wallet Address.',
                '2. Paste your 42-character 0x Polygon address.',
                '3. Click "Verify & Save Address".'
              ],
              warning: 'Never enter a centralized exchange deposit address that does not support custom Polygon tokens. Always use a self-custody wallet.'
            }
          ]
        },
        relatedArticleIds: ['withdrawing-rewards', 'why-a-payout-may-be-pending']
      },
      {
        id: 'why-a-payout-may-be-pending',
        categoryId: 'rewards',
        title: 'Why a payout may be pending',
        summary: 'Understanding payout batching, relayer queues, and network confirmation delays.',
        readTime: '2 min read',
        tags: ['pending-payout', 'relayer', 'delay', 'batch', 'queue'],
        content: {
          intro: 'Withdrawal requests are processed through automated relayer contracts on Polygon.',
          sections: [
            {
              heading: 'Common Pending Reasons',
              body: [
                'Batch Processing: Payouts are bundled periodically into smart contract batches to optimize gas efficiency.',
                'Polygon Congestion: High gas spikes on Polygon PoS can temporarily delay relayer transaction inclusion.',
                '2FA Confirmation: High-value withdrawal requests may require 2FA verification before final dispatch.'
              ]
            }
          ]
        },
        relatedArticleIds: ['withdrawing-rewards', 'payout-wallet']
      }
    ]
  },
  {
    id: 'donations',
    title: 'Donations',
    description: 'Learn how to send token donations, verify recipient contracts, and view donation history.',
    iconName: 'Heart',
    color: '#EC4899',
    articles: [
      {
        id: 'how-to-donate-tokens',
        categoryId: 'donations',
        title: 'How to donate tokens',
        summary: 'Step-by-step walkthrough of sending an ERC-20 token donation.',
        readTime: '3 min read',
        tags: ['donate', 'transfer', 'charity', 'send', 'instructions'],
        content: {
          intro: 'Donating tokens through TokenCare is direct, transparent, and non-custodial.',
          sections: [
            {
              heading: 'How to Send a Donation',
              body: [
                '1. Locate the verified cause or token in Explore Marketplace or Add Token.',
                '2. Connect your Web3 wallet (MetaMask, WalletConnect, Rainbow, etc.).',
                '3. Choose the amount of tokens you wish to donate.',
                '4. Approve the token allowance if required, then confirm the transfer in your wallet.'
              ],
              tip: 'TokenCare provides a direct link to the verified block explorer transaction receipt immediately after confirmation.'
            }
          ]
        },
        relatedArticleIds: ['selecting-a-token-to-donate', 'what-happens-after-a-donation']
      },
      {
        id: 'selecting-a-token-to-donate',
        categoryId: 'donations',
        title: 'Selecting a token to donate',
        summary: 'How to choose verified tokens, compare market liquidity, and avoid high-slippage transfers.',
        readTime: '2 min read',
        tags: ['select-token', 'liquidity', 'slippage', 'verified'],
        content: {
          intro: 'Choosing the right token ensures maximum donation value reaches the recipient.',
          sections: [
            {
              heading: 'Selection Guidelines',
              body: [
                'Look for the Verified Green Shield: Confirms absence of malicious buy/sell taxes.',
                'Check Liquidity: Tokens with >$50,000 liquidity experience minimal price impact during donation routing.',
                'Select Low-Fee Networks: Donating on Polygon, Arbitrum, or Base saves significant gas compared to Ethereum Mainnet.'
              ]
            }
          ]
        },
        relatedArticleIds: ['how-to-donate-tokens', 'donation-status']
      },
      {
        id: 'what-happens-after-a-donation',
        categoryId: 'donations',
        title: 'What happens after a donation',
        summary: 'On-chain settlement, receipt generation, and donor ranking badges.',
        readTime: '2 min read',
        tags: ['receipt', 'settlement', 'after-donation', 'confirmation'],
        content: {
          intro: 'When your transaction confirms on the blockchain, several automated events occur:',
          sections: [
            {
              heading: 'Post-Donation Events',
              body: [
                'Direct Settlement: 100% of the donated tokens are received by the designated recipient contract.',
                'Verified Receipt: A cryptographic transaction hash is generated and logged in your profile.',
                'Community Badge: Your account accumulates donation reputation points visible on the leaderboard.'
              ]
            }
          ]
        },
        relatedArticleIds: ['how-to-donate-tokens', 'donation-history']
      },
      {
        id: 'donation-status',
        categoryId: 'donations',
        title: 'Donation status',
        summary: 'Understanding submitted, pending, confirmed, and failed donation states.',
        readTime: '2 min read',
        tags: ['status', 'pending', 'confirmed', 'failed'],
        content: {
          intro: 'TokenCare tracks donation status in real time as transactions transition through the blockchain network.',
          sections: [
            {
              heading: 'Status Explanations',
              body: [
                'Pending (Mempool): The transaction has been signed and broadcast to validators.',
                'Confirmed (Mined): The transaction has been included in a block with final on-chain settlement.',
                'Failed: The transaction reverted, commonly due to insufficient gas or slippage tolerance.'
              ]
            }
          ]
        },
        relatedArticleIds: ['failed-or-pending-donations', 'donation-history']
      },
      {
        id: 'donation-history',
        categoryId: 'donations',
        title: 'Donation history',
        summary: 'Viewing your past donations, receipts, and tax-exempt logs.',
        readTime: '2 min read',
        tags: ['history', 'logs', 'records', 'receipts'],
        content: {
          intro: 'You can review all historical donation activity anytime within the application.',
          sections: [
            {
              heading: 'Accessing History',
              body: [
                '1. Go to the "Dashboard" or "Tokens" tab.',
                '2. Scroll down to the Donation Activity section.',
                '3. Click on any past entry to view the full block explorer receipt, timestamp, and USD conversion rate at the time of donation.'
              ]
            }
          ]
        },
        relatedArticleIds: ['how-to-donate-tokens', 'what-happens-after-a-donation']
      },
      {
        id: 'failed-or-pending-donations',
        categoryId: 'donations',
        title: 'Failed or pending donations',
        summary: 'Troubleshooting reverted transactions, out-of-gas errors, and mempool delays.',
        readTime: '3 min read',
        tags: ['failed', 'revert', 'out-of-gas', 'troubleshoot'],
        content: {
          intro: 'If a donation fails or remains stuck in pending status, check these common causes:',
          sections: [
            {
              heading: 'Resolving Common Issues',
              body: [
                'Insufficient Gas: Ensure you hold enough native tokens (e.g. MATIC on Polygon, ETH on Base) to pay network transaction fees.',
                'Allowance Rejection: ERC-20 tokens require a one-time "Approve" transaction before the donation transfer can execute.',
                'Slippage Spike: High market volatility during transaction execution can cause slippage protection to safely revert the swap.'
              ]
            }
          ]
        },
        relatedArticleIds: ['donation-status', 'how-to-donate-tokens']
      }
    ]
  },
  {
    id: 'account-security',
    title: 'Account & Security',
    description: 'Password management, Two-Factor Authentication (2FA), and safeguarding credentials.',
    iconName: 'Shield',
    color: '#10B981',
    articles: [
      {
        id: 'changing-password',
        categoryId: 'account-security',
        title: 'Changing password',
        summary: 'Update your account password securely from Settings.',
        readTime: '2 min read',
        tags: ['password', 'change', 'security', 'update'],
        content: {
          intro: 'You can update your TokenCare account password at any time in your Settings panel.',
          sections: [
            {
              heading: 'Step-by-Step Password Change',
              body: [
                '1. Navigate to Settings > Wallet & Security.',
                '2. Click "Change Password".',
                '3. Enter your new password (minimum 8 characters with at least one number and special symbol).',
                '4. Re-enter the new password to confirm, then click "Update Password".'
              ],
              tip: 'Use a unique password generated by a trusted password manager.'
            }
          ]
        },
        relatedArticleIds: ['forgot-password', 'two-factor-authentication', 'account-security']
      },
      {
        id: 'forgot-password',
        categoryId: 'account-security',
        title: 'Forgot password',
        summary: 'How to request a secure password reset link to your registered email.',
        readTime: '2 min read',
        tags: ['forgot-password', 'reset-link', 'recover', 'email-reset'],
        content: {
          intro: 'If you forgot your password, you can trigger an automated password reset link from the login screen.',
          sections: [
            {
              heading: 'Password Recovery Steps',
              body: [
                '1. Log out or open the Auth screen.',
                '2. Click "Forgot Password?".',
                '3. Enter your registered email address and click "Send Reset Link".',
                '4. Check your inbox (and spam folder) for the TokenCare password recovery email and follow the secure link.'
              ]
            }
          ]
        },
        relatedArticleIds: ['changing-password', 'login-problems']
      },
      {
        id: 'two-factor-authentication',
        categoryId: 'account-security',
        title: 'Two-factor authentication',
        summary: 'Protect your account with Google Authenticator, Authy, or 1Password TOTP codes.',
        readTime: '3 min read',
        tags: ['2fa', 'totp', 'mfa', 'authenticator', 'google-authenticator'],
        content: {
          intro: 'Two-Factor Authentication (2FA) adds a critical second layer of protection to your TokenCare account using standard Time-based One-Time Passwords (TOTP).',
          sections: [
            {
              heading: 'Enabling 2FA in TokenCare',
              body: [
                '1. Go to Settings > 2FA Security.',
                '2. Open your authenticator app (Google Authenticator, Authy, or 1Password) and scan the displayed QR code.',
                '3. Copy the backup secret key and store it in a secure location.',
                '4. Enter the 6-digit verification code from your authenticator app to activate protection.'
              ],
              tip: 'Once 2FA is active, withdrawals and sensitive security updates will require your 6-digit TOTP code.'
            }
          ]
        },
        relatedArticleIds: ['verification-codes', 'account-security']
      },
      {
        id: 'verification-codes',
        categoryId: 'account-security',
        title: 'Verification codes',
        summary: 'Understanding TOTP time-sync codes, email confirmation links, and backup codes.',
        readTime: '2 min read',
        tags: ['codes', 'totp', 'sync', 'backup', 'otp'],
        content: {
          intro: 'Verification codes authenticate high-security operations such as password changes and reward withdrawals.',
          sections: [
            {
              heading: 'Code Types and Troubleshooting',
              body: [
                'Authenticator Codes (TOTP): 6-digit codes that refresh every 30 seconds. Ensure your phone clock is set to automatic time synchronization.',
                'Email Codes: Time-limited verification links sent during initial registration.',
                'Backup Keys: Emergency recovery keys generated when you first enable 2FA.'
              ]
            }
          ]
        },
        relatedArticleIds: ['two-factor-authentication', 'account-security']
      },
      {
        id: 'account-security',
        categoryId: 'account-security',
        title: 'Account security',
        summary: 'Best practices for securing your Web3 wallet, API keys, and TokenCare profile.',
        readTime: '3 min read',
        tags: ['best-practices', 'phishing', 'keys', 'safeguards'],
        content: {
          intro: 'Protecting your digital assets and curator account requires adopting standard Web3 security habits.',
          sections: [
            {
              heading: 'Security Recommendations',
              body: [
                'Never Share Private Keys: TokenCare staff will never ask for your seed phrase, private keys, or passwords.',
                'Enable 2FA: Always protect your account with an authenticator app.',
                'Verify Domain: Ensure you are accessing the official TokenCare application domain before signing transactions.'
              ]
            }
          ]
        },
        relatedArticleIds: ['two-factor-authentication', 'profile-settings']
      },
      {
        id: 'profile-settings',
        categoryId: 'account-security',
        title: 'Profile settings',
        summary: 'Managing your display name, username handle, avatar, and linked payout address.',
        readTime: '2 min read',
        tags: ['profile', 'avatar', 'username', 'settings'],
        content: {
          intro: 'You can personalize your TokenCare curator identity and update account metadata in Profile Settings.',
          sections: [
            {
              heading: 'Editable Profile Fields',
              body: [
                'Display Name & Username: Customize how your curator profile appears on token submissions and leaderboards.',
                'Avatar Image: Provide a custom profile picture URL.',
                'Payout Wallet Address: Set and verify your Polygon EVM address for reward claims.'
              ]
            }
          ]
        },
        relatedArticleIds: ['account-security', 'payout-wallet']
      },
      {
        id: 'session-security-questions',
        categoryId: 'account-security',
        title: 'Session & security questions',
        summary: 'Session token lifetimes, device authorization markers, and automatic logout behavior.',
        readTime: '2 min read',
        tags: ['sessions', 'timeout', 'logout', 'devices'],
        content: {
          intro: 'TokenCare manages authenticated sessions securely through cryptographic JWT tokens.',
          sections: [
            {
              heading: 'Session Management',
              body: [
                'Token Lifetimes: Authentication tokens auto-refresh in the background while your device remains active.',
                'Device Isolation: Logging in on a new browser registers a separate secure session.',
                'Manual Logout: Click "Sign Out" in Settings to instantly invalidate all local session credentials.'
              ]
            }
          ]
        },
        relatedArticleIds: ['account-security', 'logging-in']
      }
    ]
  },
  {
    id: 'settings-preferences',
    title: 'Settings & Preferences',
    description: 'Customize theme, language, currencies, notification alerts, and cache controls.',
    iconName: 'Settings',
    color: '#8B5CF6',
    articles: [
      {
        id: 'dark-mode-preferences',
        categoryId: 'settings-preferences',
        title: 'Dark Mode',
        summary: 'Configuring dark theme and high-contrast display modes in TokenCare.',
        readTime: '2 min read',
        tags: ['theme', 'dark-mode', 'contrast', 'ui'],
        content: {
          intro: 'TokenCare features an eye-safe dark theme designed for modern OLED displays.',
          sections: [
            {
              heading: 'Theme Settings',
              body: [
                'TokenCare defaults to an optimized high-contrast dark palette (#06080E / #090C12).',
                'Color contrast is mathematically aligned with WCAG AA readability standards for optimal chart and code legibility.'
              ]
            }
          ]
        },
        relatedArticleIds: ['language-settings', 'currency-display-settings']
      },
      {
        id: 'language-settings',
        categoryId: 'settings-preferences',
        title: 'Language',
        summary: 'Switching interface language between English, Spanish, French, German, and Chinese.',
        readTime: '2 min read',
        tags: ['language', 'locale', 'translation', 'i18n'],
        content: {
          intro: 'TokenCare supports multiple international languages to serve the global Web3 community.',
          sections: [
            {
              heading: 'Changing Language',
              body: [
                '1. Open Settings > App Preferences.',
                '2. Click the "Interface Language" dropdown.',
                '3. Choose your preferred language. The UI will instantly update labels, metrics, and prompts.'
              ]
            }
          ]
        },
        relatedArticleIds: ['currency-display-settings', 'dark-mode-preferences']
      },
      {
        id: 'currency-display-settings',
        categoryId: 'settings-preferences',
        title: 'Currency',
        summary: 'How to switch currency display between USD, EUR, GBP, JPY, CAD, and AUD.',
        readTime: '2 min read',
        tags: ['currency', 'usd', 'eur', 'gbp', 'fiat', 'exchange-rate'],
        content: {
          intro: 'You can customize the fiat currency used to display reward values, token market caps, and donation totals.',
          sections: [
            {
              heading: 'Supported Display Currencies',
              body: [
                'USD ($) — United States Dollar (Default)',
                'EUR (€) — Euro',
                'GBP (£) — British Pound Sterling',
                'JPY (¥) — Japanese Yen',
                'CAD ($) — Canadian Dollar',
                'AUD ($) — Australian Dollar'
              ]
            }
          ]
        },
        relatedArticleIds: ['token-prices', 'understanding-reward-balance']
      },
      {
        id: 'notification-preferences',
        categoryId: 'settings-preferences',
        title: 'Notifications',
        summary: 'Configuring realtime alerts for token approvals, reward payouts, and security events.',
        readTime: '2 min read',
        tags: ['notifications', 'alerts', 'realtime', 'preferences'],
        content: {
          intro: 'Customize which alerts you receive through in-app notification toasts and the Notification Center.',
          sections: [
            {
              heading: 'Notification Categories',
              body: [
                'Token Approval Alerts: Instant notification when a submitted token passes security checks.',
                'Payout Confirmations: Alerts when your requested reward withdrawal is broadcast to Polygon.',
                'Security Notices: Urgent alerts regarding password resets, 2FA modifications, and new device logins.'
              ]
            }
          ]
        },
        relatedArticleIds: ['privacy-preferences-settings', 'account-security']
      },
      {
        id: 'clear-storage-data',
        categoryId: 'settings-preferences',
        title: 'Clear Storage',
        summary: 'How to reset local cached tokens, search history, and offline storage safely.',
        readTime: '2 min read',
        tags: ['clear-storage', 'cache', 'reset', 'localstorage', 'indexeddb'],
        content: {
          intro: 'The Clear Storage tool wipes temporary client-side cached data without deleting your cloud account or on-chain assets.',
          sections: [
            {
              heading: 'What Clear Storage Does',
              body: [
                'Removes cached ERC-20 token inspection reports and logo images.',
                'Clears offline search history and temporary contract queries.',
                'Forces the app to fetch fresh, uncached blockchain data from RPC nodes on next load.'
              ],
              tip: 'Use Clear Storage if a recently updated contract is displaying stale token details.'
            }
          ]
        },
        relatedArticleIds: ['cached-data-behavior', 'offline-behavior']
      },
      {
        id: 'cached-data-behavior',
        categoryId: 'settings-preferences',
        title: 'Cached data',
        summary: 'How TokenCare caches data in IndexedDB and localStorage for instant loading.',
        readTime: '2 min read',
        tags: ['cache', 'indexeddb', 'performance', 'speed'],
        content: {
          intro: 'TokenCare uses a dual-layer caching engine (IndexedDB + localStorage) to ensure ultra-fast startup times.',
          sections: [
            {
              heading: 'Caching Logic',
              body: [
                'Verified token directory entries and logos are cached locally on first view.',
                'When you open the app, cached tokens render in 0ms while a background worker checks for upstream updates.',
                'Sensitive authentication tokens are stored in secure, isolated storage.'
              ]
            }
          ]
        },
        relatedArticleIds: ['clear-storage-data', 'offline-behavior']
      },
      {
        id: 'offline-behavior',
        categoryId: 'settings-preferences',
        title: 'Offline behavior',
        summary: 'Using TokenCare without an internet connection and automatic reconnect sync.',
        readTime: '2 min read',
        tags: ['offline', 'sync', 'connectivity', 'pwa'],
        content: {
          intro: 'TokenCare is engineered as an offline-first Progressive Web App (PWA).',
          sections: [
            {
              heading: 'Offline Features',
              body: [
                'Browse previously verified tokens, saved submissions, and help documentation offline.',
                'An offline indicator will appear in the header bar when connectivity is lost.',
                'The moment your internet connection returns, TokenCare automatically syncs changes with the backend.'
              ]
            }
          ]
        },
        relatedArticleIds: ['cached-data-behavior', 'clear-storage-data']
      },
      {
        id: 'privacy-preferences-settings',
        categoryId: 'settings-preferences',
        title: 'Privacy preferences',
        summary: 'Manage diagnostic telemetry, marketing alerts, and local data sharing toggles.',
        readTime: '2 min read',
        tags: ['privacy', 'preferences', 'telemetry', 'analytics', 'opt-out'],
        content: {
          intro: 'TokenCare gives you complete granular control over diagnostic and analytics preferences.',
          sections: [
            {
              heading: 'Available Privacy Toggles',
              body: [
                'Performance Diagnostics: Helps us identify client-side RPC query errors and crashes.',
                'Marketing Alerts: Optional updates on new EVM chain integrations and reward multiplier events.',
                'All privacy preferences are stored locally in your browser and respected across sessions.'
              ]
            }
          ]
        },
        relatedArticleIds: ['notification-preferences', 'clear-storage-data']
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Quick resolutions for app loading, token indexing, wallet sync, and common errors.',
    iconName: 'AlertTriangle',
    color: '#EF4444',
    articles: [
      {
        id: 'app-not-loading',
        categoryId: 'troubleshooting',
        title: 'App not loading',
        summary: 'Resolving blank screens, network timeouts, or cached script conflicts.',
        readTime: '2 min read',
        tags: ['not-loading', 'blank-screen', 'crash', 'timeout', 'refresh'],
        content: {
          intro: 'If TokenCare is not loading properly in your browser, follow these quick recovery steps:',
          sections: [
            {
              heading: 'Troubleshooting Steps',
              body: [
                '1. Perform a Hard Refresh: Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to reload fresh application scripts.',
                '2. Check Internet Connection: Verify you have an active network connection.',
                '3. Clear Browser Cache: Go to browser settings and clear cached images and files, or use the Settings > Clear Storage option.'
              ]
            }
          ]
        },
        relatedArticleIds: ['clear-storage-data', 'offline-behavior', 'unexpected-app-behavior']
      },
      {
        id: 'token-not-appearing',
        categoryId: 'troubleshooting',
        title: 'Token not appearing',
        summary: 'What to do if a submitted token is missing from the directory or your dashboard.',
        readTime: '2 min read',
        tags: ['missing-token', 'not-appearing', 'indexing', 'delay'],
        content: {
          intro: 'If a token you submitted does not immediately appear in the Explore directory or your Tokens tab:',
          sections: [
            {
              heading: 'Common Solutions',
              body: [
                'Wait 30–60 Seconds: Newly verified tokens require a short indexing cycle before appearing in global search.',
                'Verify Network Filter: Ensure the network filter in Explore matches the chain of the submitted token.',
                'Check Account Ownership: Ensure you are logged into the same account used when submitting the token.'
              ]
            }
          ]
        },
        relatedArticleIds: ['why-a-token-may-not-appear', 'token-information-not-updating']
      },
      {
        id: 'token-information-not-updating',
        categoryId: 'troubleshooting',
        title: 'Token information not updating',
        summary: 'Resolving stale prices, outdated logos, or unrefreshed liquidity metrics.',
        readTime: '2 min read',
        tags: ['stale-price', 'stale-data', 'refresh', 'dexscreener', 'cache'],
        content: {
          intro: 'TokenCare caches token metadata locally to optimize speed. If prices or liquidity seem outdated:',
          sections: [
            {
              heading: 'How to Force Fresh Data',
              body: [
                '1. Open the token inspection view and click the refresh icon next to the price quote.',
                '2. Clear cached application storage via Settings > Clear Storage.',
                '3. Check DEX Liquidity: If trading volume is extremely low, price aggregators may update less frequently.'
              ]
            }
          ]
        },
        relatedArticleIds: ['token-prices', 'clear-storage-data']
      },
      {
        id: 'reward-balance-not-updating',
        categoryId: 'troubleshooting',
        title: 'Reward balance not updating',
        summary: 'Fixing discrepancies between local balance displays and database totals.',
        readTime: '2 min read',
        tags: ['balance-desync', 'reward-issue', 'sync', 'pending'],
        content: {
          intro: 'If your displayed reward balance does not reflect a recent verified submission:',
          sections: [
            {
              heading: 'Troubleshooting Steps',
              body: [
                'Check Network Sync: Click the sync indicator icon in the header to synchronize state with the server.',
                'Verify Submission Status: Ensure the token completed all 4 verification stages and passed honeypot audits.',
                'Duplicate Submissions: Only the first curator to register a unique contract is awarded the primary reward bounty.'
              ]
            }
          ]
        },
        relatedArticleIds: ['understanding-reward-balance', 'how-rewards-are-calculated']
      },
      {
        id: 'verification-problems',
        categoryId: 'troubleshooting',
        title: 'Verification problems',
        summary: 'Troubleshooting contract bytecode read errors and RPC timeout issues.',
        readTime: '3 min read',
        tags: ['rpc-error', 'bytecode-error', 'timeout', 'audit-failed'],
        content: {
          intro: 'If the Add Token inspection fails or displays an RPC connection error:',
          sections: [
            {
              heading: 'Common Fixes',
              body: [
                'Ensure Correct Chain: Double-check that the selected EVM chain matches the contract deployment network.',
                'Verify Contract Deployment: Check the address on the block explorer to confirm bytecode is deployed and not an empty EOA wallet.',
                'Switch RPC Provider: Configure custom Infura or Alchemy keys in Settings > API Settings if public nodes are rate-limited.'
              ]
            }
          ]
        },
        relatedArticleIds: ['how-token-safety-checks-work', 'token-networks']
      },
      {
        id: 'login-problems',
        categoryId: 'troubleshooting',
        title: 'Login problems',
        summary: 'Resolving invalid password errors, 2FA code rejections, and session expired alerts.',
        readTime: '2 min read',
        tags: ['login-error', 'auth-fail', '2fa-reject', 'session-expired'],
        content: {
          intro: 'If you are having trouble signing into your account:',
          sections: [
            {
              heading: 'Common Solutions',
              body: [
                '2FA Time Desync: Ensure your device time is set to automatic network time; TOTP codes rely on precise seconds.',
                'Password Reset: Use the "Forgot Password" link on the sign-in modal to trigger a secure reset email.',
                'Clear Site Cookies: If a session token was corrupted, clear browser cookies for the site and sign in again.'
              ]
            }
          ]
        },
        relatedArticleIds: ['logging-in', 'forgot-password', 'two-factor-authentication']
      },
      {
        id: 'unexpected-app-behavior',
        categoryId: 'troubleshooting',
        title: 'Unexpected app behavior',
        summary: 'What to do when encountering unexpected UI states or glitches.',
        readTime: '2 min read',
        tags: ['glitch', 'ui-bug', 'unexpected', 'reset'],
        content: {
          intro: 'If you encounter an unexpected UI state or freeze in the app:',
          sections: [
            {
              heading: 'Quick Resolution Steps',
              body: [
                '1. Switch View Modes: On desktop, toggle between Desktop View and Mobile View in the top bar.',
                '2. Reload Application: Reload the browser tab to reset transient React component state.',
                '3. Clear Local Storage: Use the Clear Storage tool in Settings to flush local storage.'
              ]
            }
          ]
        },
        relatedArticleIds: ['app-not-loading', 'reporting-a-bug']
      },
      {
        id: 'reporting-a-bug',
        categoryId: 'troubleshooting',
        title: 'Reporting a bug',
        summary: 'How to submit a detailed bug report with diagnostic logs to our engineering team.',
        readTime: '2 min read',
        tags: ['report-bug', 'ticket', 'support', 'issue', 'feedback'],
        content: {
          intro: 'We deeply appreciate community reports that help us improve TokenCare.',
          sections: [
            {
              heading: 'How to Submit a Bug Report',
              body: [
                '1. Navigate to Settings > Contact Support.',
                '2. Select "Report a Problem / Ticket".',
                '3. Select the issue category (e.g. Verification, UI, Wallet, Rewards).',
                '4. Describe the expected vs actual behavior and attach optional screenshots.',
                '5. Click "Submit Ticket". Our support engineering desk responds within 24 hours.'
              ],
              tip: 'For urgent matters, use the "Chat with TokenCare" live chat feature in Contact Support.'
            }
          ]
        },
        relatedArticleIds: ['unexpected-app-behavior', 'app-not-loading']
      }
    ]
  }
];

/**
 * Search help articles across titles, summaries, sections, and tags
 */
export function searchHelpArticles(query: string): {
  article: HelpArticle;
  category: HelpCategory;
  matchSnippet: string;
}[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();
  const results: { article: HelpArticle; category: HelpCategory; matchSnippet: string }[] = [];

  for (const cat of HELP_CATEGORIES) {
    for (const art of cat.articles) {
      const inTitle = art.title.toLowerCase().includes(q);
      const inSummary = art.summary.toLowerCase().includes(q);
      const inTags = art.tags.some((t) => t.toLowerCase().includes(q));
      let matchSnippet = art.summary;

      let inBody = false;
      for (const sec of art.content.sections) {
        if (sec.heading.toLowerCase().includes(q)) {
          inBody = true;
          matchSnippet = `${sec.heading}: ${sec.body[0] || art.summary}`;
          break;
        }
        for (const b of sec.body) {
          if (b.toLowerCase().includes(q)) {
            inBody = true;
            matchSnippet = b;
            break;
          }
        }
        if (inBody) break;
      }

      if (inTitle || inSummary || inTags || inBody) {
        results.push({
          article: art,
          category: cat,
          matchSnippet,
        });
      }
    }
  }

  return results;
}

/**
 * Find a specific article by its ID
 */
export function getHelpArticleById(id: string): { article: HelpArticle; category: HelpCategory } | null {
  for (const cat of HELP_CATEGORIES) {
    const art = cat.articles.find((a) => a.id === id);
    if (art) {
      return { article: art, category: cat };
    }
  }
  return null;
}
