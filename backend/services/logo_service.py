import requests

TRUST_WALLET_PLATFORMS = {
    "1": "ethereum",
    "137": "polygon",
    "8453": "base",
    "56": "smartchain",
    "42161": "arbitrum"
}

def resolve_logo(contract_address: str, chain_id: str, provider_logos: list = None) -> str:
    """
    Resolves token logo using strict fallback order:
    1. Direct Provider candidate logos (DexScreener, CoinGecko, GeckoTerminal)
    2. TrustWallet Open-Source Asset Repository
    3. If unavailable -> None (null)
    Note: Does NOT substitute a blockchain native logo for a token logo.
    """
    if provider_logos:
        for logo in provider_logos:
            if logo and isinstance(logo, str) and logo.startswith("http"):
                return logo

    # TrustWallet open source GitHub repository check
    tw_platform = TRUST_WALLET_PLATFORMS.get(str(chain_id))
    if tw_platform and contract_address and contract_address.startswith("0x"):
        tw_url = f"https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/{tw_platform}/assets/{contract_address}/logo.png"
        try:
            resp = requests.head(tw_url, timeout=1.5)
            if resp.status_code == 200:
                return tw_url
        except Exception:
            pass

    return None
