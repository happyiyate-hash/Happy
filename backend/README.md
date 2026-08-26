# TokenCare API Backend

Independent Python Serverless API for TokenCare, built for deployment on Vercel as a standalone Vercel project sharing the same Git repository.

## Vercel Project Deployment Setup

When creating the Vercel project for this backend:

1. Connect the GitHub Repository to Vercel.
2. In Project Settings, set **Root Directory** to `backend`.
3. Vercel automatically detects the `@vercel/python` runtime for functions under `api/`.
4. Deploy the backend to receive its dedicated API URL (e.g. `https://tokencare-api.vercel.app`).

---

## Directory Structure

```
backend/
├── api/
│   ├── token_details.py      ← Endpoint: POST/GET /api/token-details
│   ├── token_price.py        ← Endpoint: POST/GET /api/token-price
│   ├── token_batch_price.py  ← Endpoint: POST /api/token-batch-price
│   └── token_chart.py        ← Endpoint: POST/GET /api/token-chart
│
├── services/
│   ├── metadata.py           ← Metadata discovery & Trust Score calculation
│   ├── pricing.py            ← Price aggregation, batch processing & charts
│   ├── logos.py              ← Multi-source logo resolver
│   ├── providers.py          ← External API clients (DexScreener, CoinGecko, etc.)
│   └── normalization.py      ← Chain canonicalization & address validation
│
├── requirements.txt          ← Dependencies for Vercel Python runtime
├── vercel.json               ← Vercel route and build configurations
└── README.md
```

---

## API Endpoints & Request/Response Schemas

### 1. Token Details Endpoint (`/api/token-details`)

**Request (POST JSON or GET query params):**
```json
{
  "chainId": "137",
  "contractAddress": "0x1a9b2f2b37951b150528d328292054453e632832"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "contractAddress": "0x1a9b2f2b37951b150528d328292054453e632832",
  "chainId": "137",
  "trustScore": 98,
  "securityScore": 45,
  "marketMaturityScore": 45,
  "verdict": "APPROVED_EXCELLENT",
  "verdictLabel": "Audited / Excellent 🟢",
  "status": "APPROVED",
  "riskRating": "LOW",
  "recommendation": "Verified smart contract on Polygon PoS.",
  "actionableRecommendation": "Verified smart contract on Polygon PoS. Safe for community donations.",
  "warnings": [],
  "passedSecurity": ["0% Honeypot risk verified", "Contract source code verified"],
  "passedMarket": ["Liquidity pool depth: $450,000 USD"],
  "categories": { ... },
  "providers": [ ... ],
  "token": {
    "id": "backend-137-0x1a9b2f2b",
    "address": "0x1a9b2f2b37951b150528d328292054453e632832",
    "chainId": "137",
    "blockchainName": "Polygon PoS",
    "blockchainType": "evm",
    "verified": true,
    "metadata": {
      "address": "0x1a9b2f2b37951b150528d328292054453e632832",
      "chainId": "137",
      "name": "TokenCare Shield Token",
      "symbol": "CARE",
      "decimals": 18,
      "totalSupply": "1,000,000,000",
      "logoUrl": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x1a9b2f2b37951b150528d328292054453e632832/logo.png",
      "blockchainName": "Polygon PoS"
    },
    "marketData": {
      "priceUsd": 0.54,
      "priceNative": 0.38,
      "priceChange24h": 3.45,
      "volume24h": 125000.0,
      "liquidityUsd": 450000.0,
      "marketCapUsd": 540000000.0,
      "fdvUsd": 540000000.0
    },
    "safety": {
      "score": 98,
      "rating": "SAFE",
      "recommendation": "Verified smart contract on Polygon PoS.",
      "isHoneypot": false,
      "isOpenSource": true,
      "isOwnershipRenounced": true,
      "isLiquidityLocked": true,
      "liquidityLockedPct": 92.5
    }
  }
}
```

---

### 2. Token Price Endpoint (`/api/token-price`)

**Request (POST JSON or GET query params):**
```json
{
  "chainId": "137",
  "contractAddress": "0x1a9b2f2b37951b150528d328292054453e632832"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chainId": "137",
    "contractAddress": "0x1a9b2f2b37951b150528d328292054453e632832",
    "priceUsd": 0.54,
    "priceNative": 0.38,
    "priceChange24h": 3.45,
    "volume24h": 125000.0,
    "liquidityUsd": 450000.0,
    "source": "dexscreener",
    "timestamp": 1785921587
  }
}
```

---

### 3. Token Batch Price Endpoint (`/api/token-batch-price`)

**Request (POST JSON):**
```json
{
  "tokens": [
    { "chainId": "1", "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
    { "chainId": "137", "contractAddress": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174" },
    { "chainId": "8453", "contractAddress": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "total": 3,
  "results": [
    {
      "chainId": "1",
      "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "priceUsd": 1.0,
      "priceNative": 0.00038,
      "priceChange24h": 0.01,
      "volume24h": 45000000.0,
      "liquidityUsd": 120000000.0,
      "source": "dexscreener",
      "timestamp": 1785921587
    },
    ...
  ],
  "timestamp": 1785921587
}
```

---

### 4. Token Chart Endpoint (`/api/token-chart`)

**Request (POST JSON or GET query params):**
```json
{
  "chainId": "137",
  "contractAddress": "0x1a9b2f2b37951b150528d328292054453e632832",
  "timeframe": "24h"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chainId": "137",
    "contractAddress": "0x1a9b2f2b37951b150528d328292054453e632832",
    "timeframe": "24h",
    "currentPriceUsd": 0.54,
    "priceChange24h": 3.45,
    "points": [
      { "timestamp": 1785835187, "priceUsd": 0.5218 },
      { "timestamp": 1785838787, "priceUsd": 0.5245 },
      { "timestamp": 1785921587, "priceUsd": 0.5400 }
    ],
    "source": "dexscreener"
  }
}
```

---

## Provider Fallback Architecture

For metadata, security, pricing, and logos:

```
                  ┌────────────────────────┐
                  │ Token API Request      │
                  └───────────┬────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
  Provider A: DexScreener               Provider B: CoinGecko
  (Real-time DEX Pairs, Price, Logo)    (Market Cap, Supply, Coin Metadata)
            │                                   │
            └─────────────────┬─────────────────┘
                              │ (if unlisted)
            ┌─────────────────┴─────────────────┐
            │                                   │
  Provider C: EVM RPC (Direct Contract) Provider D: GeckoTerminal / GoPlus
  (eth_call name/symbol/decimals)       (Pool Reserves & Security Analysis)
            │                                   │
            └─────────────────┬─────────────────┘
                              │
                   Logo Fallback Pipeline:
         1. Provider Image URL (DexScreener / CoinGecko)
         2. TrustWallet Open-Source Asset Repo
         3. Neutral Token Fallback Vector Icon
```

---

## Caching Strategy

- **Static Metadata (`METADATA_CACHE`)**: 3600 seconds (1 hour) TTL.
- **Token Price (`PRICE_CACHE`)**: 60 seconds TTL (ensures fresh market rates while protecting external providers).
- **Chart History (`CHART_CACHE`)**: 300 seconds (5 minutes) TTL.
