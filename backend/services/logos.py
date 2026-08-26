import requests
from .normalization import normalize_chain

# TrustWallet mapping for chain directory
TRUST_WALLET_PLATFORM_MAP = {
    "1": "ethereum",
    "137": "polygon",
    "8453": "base",
    "56": "smartchain",
    "42161": "arbitrum",
    "solana": "solana"
}

NEUTRAL_TOKEN_FALLBACK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 6v12M6 12h12'/></svg>"

def resolve_token_logo(address: str, chain_id: str, provider_logos: list = None) -> str:
    """
    Multi-source logo resolver with strict fallback order:
    1. Direct Provider candidate logos (DexScreener, CoinGecko)
    2. TrustWallet Open-Source Asset Repository
    3. Chain Native Token / Neutral Fallback SVG
    """
    if provider_logos:
        for logo in provider_logos:
            if logo and isinstance(logo, str) and logo.startswith("http"):
                return logo

    # TrustWallet GitHub open-source repository asset check
    chain_info = normalize_chain(chain_id)
    tw_platform = TRUST_WALLET_PLATFORM_MAP.get(str(chain_info["id"]))
    if tw_platform and address and address.startswith("0x"):
        # Format address for checksum or lowercase
        tw_url = f"https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/{tw_platform}/assets/{address}/logo.png"
        try:
            resp = requests.head(tw_url, timeout=2.0)
            if resp.status_code == 200:
                return tw_url
        except Exception:
            pass

    return NEUTRAL_TOKEN_FALLBACK_SVG
