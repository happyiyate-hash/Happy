export interface PrivacySection {
  id: string;
  number: number;
  title: string;
  subsections?: {
    subtitle: string;
    points: string[];
  }[];
  paragraphs: string[];
  keyHighlight?: string;
}

export const PRIVACY_POLICY_LAST_UPDATED = 'August 13, 2026';
export const TERMS_LAST_UPDATED = 'August 13, 2026';
export const COOKIES_LAST_UPDATED = 'August 13, 2026';

export const PRIVACY_POLICY_SECTIONS: PrivacySection[] = [
  {
    id: 'introduction',
    number: 1,
    title: 'Introduction',
    paragraphs: [
      'Welcome to TokenCare ("TokenCare," "we," "us," or "our"). TokenCare is a decentralized, non-custodial Web3 token discovery, safety inspection, and donation platform operating across multiple EVM-compatible blockchains.',
      'This Privacy Policy explains how TokenCare handles personal information, technical telemetry, and public blockchain interactions when you use our web application, smart contract interfaces, APIs, and associated services (collectively, the "Services").',
      'By accessing or using TokenCare, you acknowledge that you have read and understood the practices described in this Privacy Policy.'
    ],
    keyHighlight: 'TokenCare is architected on non-custodial Web3 principles: we do not hold your private keys, custody your funds, or sell personal data to third parties.'
  },
  {
    id: 'information-we-collect',
    number: 2,
    title: 'Information We Collect',
    paragraphs: [
      'We collect only the minimum necessary information required to operate, secure, and improve the TokenCare platform.'
    ],
    subsections: [
      {
        subtitle: '1. Account Information',
        points: [
          'Email address and encrypted authentication credentials when registering via Supabase Auth.',
          'Public profile information you choose to supply (Display Name, Username handle, and Avatar image URL).',
          'Account creation timestamps and last login records.'
        ]
      },
      {
        subtitle: '2. Authentication & Security Information',
        points: [
          'Two-Factor Authentication (2FA) status and encrypted TOTP factor registrations.',
          'Session tokens, cryptographically hashed access tokens, and device authorization markers.'
        ]
      },
      {
        subtitle: '3. Token and Donation Activity',
        points: [
          'Public ERC-20 smart contract addresses you submit for verification.',
          'Saved payout wallet addresses (Polygon EVM addresses) bound to your account for REWARD token distribution.',
          'Publicly verifiable on-chain transaction hashes resulting from donations or reward claims.'
        ]
      },
      {
        subtitle: '4. App Preferences & Technical Information',
        points: [
          'User-selected preferences (Currency Display such as USD/EUR, Interface Language, Dark Theme mode).',
          'Standard technical device telemetry (browser family, viewport dimensions, PWA installation status, and IP address for rate-limiting and DDoS mitigation).',
          'Custom RPC provider configuration keys (e.g., optional Infura/Alchemy project IDs) stored strictly in client-side storage.'
        ]
      },
      {
        subtitle: '5. Support Messages & Problem Reports',
        points: [
          'Support tickets, in-app chat communications, attached error screenshots, and diagnostic logs voluntarily submitted to our support team.'
        ]
      }
    ]
  },
  {
    id: 'how-we-use-information',
    number: 3,
    title: 'How We Use Information',
    paragraphs: [
      'We use the information we collect solely for genuine operational, security, and functional purposes:'
    ],
    subsections: [
      {
        subtitle: 'Primary Operational Purposes',
        points: [
          'Provide and Maintain TokenCare Services: Resolving token smart contracts, pulling decentralized pricing from DexScreener/CoinGecko, and executing on-chain audit simulations.',
          'Authenticate Users & Maintain Security: Securing account access, verifying 2FA TOTP challenges, and preventing unauthorized settings modifications.',
          'Process Donations & Rewards: Calculating earned REWARD token balances, maintaining the public curator leaderboard, and routing payout transactions to your saved Polygon address.',
          'Customer Support & Problem Resolution: Responding to support inquiries, investigating bug reports, and notifying users of ticket resolutions.',
          'Abuse & Sybil Attack Prevention: Detecting malicious bot activity, honeypot spamming, automated reward harvesting, and protecting platform infrastructure.',
          'Reliability & Performance: Optimizing RPC query caching and improving interface responsiveness across devices.'
        ]
      }
    ]
  },
  {
    id: 'information-we-dont-collect',
    number: 4,
    title: "Information We Don't Collect",
    paragraphs: [
      'We believe privacy is a fundamental right, especially within decentralized finance. We explicitly DO NOT collect or store:'
    ],
    subsections: [
      {
        subtitle: 'Explicitly Excluded Data Types',
        points: [
          'Private Keys & Seed Phrases: We never request, access, or store your private cryptographic keys, seed recovery phrases, or wallet passwords.',
          'Custodial Fund Access: We cannot initiate transactions or move funds from your external Web3 wallets without your explicit signature in your wallet client.',
          'Credit Card / Traditional Bank Details: TokenCare does not process fiat payments or store bank account numbers.',
          'Government IDs / Raw Biometric Data: We do not require invasive KYC identity documents, passport scans, or fingerprint data to browse or verify tokens.',
          'Third-Party Ad Tracking Profiles: We do not sell your personal browsing habits, cross-site histories, or wallet balances to data brokers or ad networks.'
        ]
      }
    ],
    keyHighlight: 'TokenCare staff will NEVER ask for your private key or seed phrase under any circumstance.'
  },
  {
    id: 'token-and-transaction-information',
    number: 5,
    title: 'Token & Transaction Information',
    paragraphs: [
      'Due to the inherent design of blockchain protocols, any smart contract interaction or transaction you broadcast to an EVM network (Ethereum, Polygon, Arbitrum, Base, etc.) is public, permanent, and accessible to anyone via public block explorers (such as Etherscan or Polygonscan).',
      'When you submit an ERC-20 token address to TokenCare, our backend queries publicly accessible JSON-RPC nodes to read contract bytecode, total supply, decimals, and liquidity pool states. These queries are read-only and do not alter on-chain state.',
      'Public token metadata submitted by users (such as token name, symbol, logo, and contract address) becomes part of the shared TokenCare public directory to benefit the broader Web3 ecosystem.'
    ]
  },
  {
    id: 'cookies-and-local-storage',
    number: 6,
    title: 'Cookies & Local Storage',
    paragraphs: [
      'TokenCare utilizes modern browser client-side storage (localStorage, sessionStorage, and IndexedDB) and secure session cookies to deliver an offline-capable, persistent experience without intrusive third-party tracking.'
    ],
    subsections: [
      {
        subtitle: 'Storage Categories Used',
        points: [
          'Essential Storage: Necessary for authenticating your session, remembering your Supabase auth state, and securing 2FA validation tokens.',
          'Preference Storage: Stores your selected fiat currency (USD/EUR/etc.), interface language, and view mode (Desktop vs. Mobile).',
          'Cached Application Data: Temporarily caches recently inspected ERC-20 contracts, token logos, and verified directories to allow instant offline viewing and reduce RPC bandwidth.',
          'Diagnostics & Crash Logs: Stores client-side error traces locally until you voluntarily submit a bug report.'
        ]
      },
      {
        subtitle: 'Managing Your Storage',
        points: [
          'You can wipe cached token items at any time via Settings > Preferences & System Cache > "Clear Storage".',
          'You can also clear browser cookies and site data via your browser settings.'
        ]
      }
    ]
  },
  {
    id: 'third-party-services',
    number: 7,
    title: 'Third-Party Services',
    paragraphs: [
      'To provide accurate multi-chain token analytics and infrastructure, TokenCare interfaces with the following vetted third-party service providers:'
    ],
    subsections: [
      {
        subtitle: 'Infrastructure & Data Providers',
        points: [
          'Supabase: Cloud database, authentication, and Row-Level Security (RLS) infrastructure hosting user profiles and withdrawal queues.',
          'EVM JSON-RPC Providers (Infura, Alchemy, Public Nodes): Used to query raw blockchain state, read ERC-20 contracts, and simulate swap routing.',
          'Market Data Aggregators (DexScreener, CoinGecko): Used to fetch real-time liquidity depth, trading volume, and USD pricing pairs.',
          'Decentralized Storage / CDNs (IPFS, Arweave, Cloudflare): Used to deliver verified token logo assets and static web bundles.'
        ]
      }
    ]
  },
  {
    id: 'data-security',
    number: 8,
    title: 'Data Security',
    paragraphs: [
      'We employ robust, industry-standard cryptographic and administrative safeguards to protect your account information against unauthorized access, alteration, or disclosure.'
    ],
    subsections: [
      {
        subtitle: 'Security Measures',
        points: [
          'Transport Layer Security (TLS 1.3): All client-to-server traffic is encrypted in transit using high-grade TLS/HTTPS.',
          'Row-Level Security (RLS): Supabase database policies ensure users can only read and mutate their own private account data.',
          'Time-Based One-Time Passwords (TOTP): Multi-factor authentication adheres to RFC 6238 standards.',
          'Client-Side Isolation: Custom RPC keys and wallet connection signatures remain within your browser sandbox and are never transmitted to unverified servers.'
        ]
      }
    ],
    keyHighlight: 'While we apply rigorous security practices, no Internet transmission or software application is 100% immune to all vulnerabilities. We encourage users to follow security best practices.'
  },
  {
    id: 'data-retention',
    number: 9,
    title: 'Data Retention',
    paragraphs: [
      'We retain your account information for as long as your TokenCare account remains active or as needed to provide you with Services.',
      'If you choose to delete your account via Settings > Delete Account, your user profile, authentication credentials, and 2FA secrets will be permanently purged from our active database within 30 days, except where retention is required by applicable law or to resolve security disputes.',
      'Public blockchain transactions (donations, payouts) cannot be deleted as they reside on immutable public ledgers.'
    ]
  },
  {
    id: 'user-rights-and-choices',
    number: 10,
    title: 'User Rights & Choices',
    paragraphs: [
      'Depending on your jurisdiction (including GDPR in the EEA and CCPA in California), you have significant rights regarding your personal information:'
    ],
    subsections: [
      {
        subtitle: 'Your Privacy Controls',
        points: [
          'Access and Update: View and edit your display name, username, and saved payout address directly in Settings.',
          'Account Deletion: Permanently delete your TokenCare account and profile records with one click in Settings.',
          'Manage Preferences: Customize analytics, currency display, language, and notification toggles in the Privacy Preferences tab.',
          'Local Cache Purge: Instantly wipe client-side storage via the "Clear Storage" tool.',
          'Direct Inquiries: Contact our Data Protection Officer at privacy@tokencare.io for custom data export or privacy requests.'
        ]
      }
    ]
  },
  {
    id: 'childrens-privacy',
    number: 11,
    title: "Children's Privacy",
    paragraphs: [
      'TokenCare is strictly directed to users who are at least 18 years old or the age of legal majority in their jurisdiction.',
      'We do not knowingly collect, solicit, or store personal information from individuals under the age of 18. If we learn that an account has been created by a minor, we will take prompt steps to terminate the account and purge associated data.'
    ]
  },
  {
    id: 'changes-to-this-policy',
    number: 12,
    title: 'Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy periodically to reflect enhancements in our architecture, new EVM chain integrations, or evolving regulatory standards.',
      'When material updates are published, we will revise the "Last Updated" date at the top of this policy and notify users via an in-app banner or notification center alert.',
      'Continued use of TokenCare following published modifications signifies your acceptance of the revised policy.'
    ]
  },
  {
    id: 'contact-us',
    number: 13,
    title: 'Contact Us',
    paragraphs: [
      'If you have questions, feedback, or privacy-related requests regarding this Privacy Policy or our security practices, please contact us through any of our official channels:'
    ],
    subsections: [
      {
        subtitle: 'Official Support & Legal Contact',
        points: [
          'Privacy & Legal Inquiries: privacy@tokencare.io',
          'General Support Desk: support@tokencare.io',
          'In-App Live Chat: Open Settings > Contact Support > Chat with TokenCare',
          'Toll-Free Support Line: +1 (800) 865-3622 (Mon–Fri, 9am–6pm EST)'
        ]
      }
    ]
  }
];

export const TERMS_OF_SERVICE_SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: 'By accessing, connecting your wallet, or using any feature of TokenCare, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this application.'
  },
  {
    id: 'non-custodial',
    title: '2. Non-Custodial Decentralized Interface',
    content: 'TokenCare operates as a decentralized, non-custodial interface for inspecting smart contracts and routing donations. TokenCare does not hold, custody, or control user cryptographic keys, tokens, or digital assets. All blockchain transfers are initiated directly by the user through their external Web3 wallet provider.'
  },
  {
    id: 'no-financial-advice',
    title: '3. No Financial, Investment, or Legal Advice',
    content: 'All token information, price charts, liquidity metrics, and automated honeypot safety audit scores displayed on TokenCare are provided strictly for informational and educational purposes. Nothing on TokenCare constitutes financial advice, investment recommendations, or an endorsement of any digital asset. You are solely responsible for conducting your own due diligence.'
  },
  {
    id: 'token-verification',
    title: '4. Token Submission & Verification Rules',
    content: 'Users who submit ERC-20 contract addresses agree not to submit malicious bytecode, phishing links, counterfeit trademarks, or infringing intellectual property. TokenCare reserves the right to unlist or flag any contract that exhibits malicious behaviors, scams, or fraudulent activity.'
  },
  {
    id: 'rewards-payouts',
    title: '5. REWARD Distribution & Payout Terms',
    content: 'TokenCare REWARD tokens are utility tokens designed to incentivize community curation. Rewards are subject to rate verification, sybil detection heuristics, and minimum withdrawal thresholds. TokenCare reserves the right to adjust reward distribution parameters to maintain long-term ecosystem integrity.'
  },
  {
    id: 'limitation-of-liability',
    title: '6. Limitation of Liability',
    content: 'To the maximum extent permitted by applicable law, TokenCare and its contributors shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from blockchain network congestion, smart contract exploits, wallet misconfigurations, or market volatility.'
  }
];

export const COOKIE_STORAGE_DETAILS = [
  {
    key: 'supabase.auth.token',
    type: 'Essential Session Storage',
    purpose: 'Maintains authenticated session credentials securely with cryptographic access tokens.',
    duration: 'Session / 30 Days'
  },
  {
    key: 'tokencare_tokens',
    type: 'Local Application Cache',
    purpose: 'Caches user-submitted verified tokens for instant offline-first rendering and minimal RPC load.',
    duration: 'Persistent until cleared'
  },
  {
    key: 'tokencare_reward_wallet',
    type: 'Local Application Cache',
    purpose: 'Stores local reward balance and pending transaction records prior to server sync.',
    duration: 'Persistent until cleared'
  },
  {
    key: 'tokencare_preferences',
    type: 'User Preferences',
    purpose: 'Remembers your selected currency display (USD/EUR), language, and theme choices.',
    duration: 'Persistent'
  },
  {
    key: 'tokencare_support_chat',
    type: 'Support State',
    purpose: 'Preserves your in-app support conversation history so messages remain intact across tabs.',
    duration: 'Persistent until ticket resolution'
  }
];
