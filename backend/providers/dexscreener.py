import os
import requests
import logging

logger = logging.getLogger("tokencare-dexscreener")
REQUEST_TIMEOUT = 4.0

def fetch_dexscreener_token(contract_address: str, chain_id: str) -> dict:
    """
    Fetches token data from DexScreener API
    """
    api_key = os.getenv("DEXSCREENER_API_KEY", "")
    headers = {}
    if api_key:
        headers["X-API-KEY"] = api_key

    try:
        url = f"https://api.dexscreener.com/latest/dex/tokens/{contract_address.lower()}"
        resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            pairs = data.get("pairs")
            if pairs and len(pairs) > 0:
                best_pair = pairs[0]
                for p in pairs:
                    if str(p.get("chainId", "")).lower() == str(chain_id).lower():
                        best_pair = p
                        break

                base_token = best_pair.get("baseToken", {})
                price_usd = float(best_pair.get("priceUsd") or 0.0)
                price_change = float((best_pair.get("priceChange") or {}).get("h24") or 0.0)
                volume_24h = float((best_pair.get("volume") or {}).get("h24") or 0.0)
                liquidity_usd = float((best_pair.get("liquidity") or {}).get("usd") or 0.0)
                market_cap = float(best_pair.get("fdv") or best_pair.get("marketCap") or 0.0)

                info = best_pair.get("info", {})
                logo = info.get("imageUrl") or None

                return {
                    "source": "dexscreener",
                    "found": True,
                    "name": base_token.get("name"),
                    "symbol": str(base_token.get("symbol") or "").upper(),
                    "logo": logo,
                    "price": price_usd,
                    "priceUsd": price_usd,
                    "priceChange24h": price_change,
                    "volume24h": volume_24h,
                    "liquidity": liquidity_usd,
                    "marketCap": market_cap,
                    "verified": True
                }
    except Exception as e:
        logger.warning(f"[DexScreener] Error fetching {contract_address}: {e}")

    return {"source": "dexscreener", "found": False}
