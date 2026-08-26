import os
import requests
import logging

logger = logging.getLogger("tokencare-geckoterminal")
REQUEST_TIMEOUT = 4.0

def fetch_geckoterminal_token(contract_address: str, geckoterminal_network: str) -> dict:
    """
    Fetches token data from GeckoTerminal API
    """
    api_key = os.getenv("GECKOTERMINAL_API_KEY", "")
    headers = {"Accept": "application/json;version=20230302"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        url = f"https://api.geckoterminal.com/api/v2/networks/{geckoterminal_network}/tokens/{contract_address.lower()}"
        resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            attr = data.get("data", {}).get("attributes", {})
            if attr:
                price_usd = float(attr.get("price_usd") or 0.0)
                volume_24h = float((attr.get("volume_usd") or {}).get("h24") or 0.0)
                liquidity = float(attr.get("total_reserve_in_usd") or 0.0)
                market_cap = float(attr.get("fdv_usd") or 0.0)
                logo = attr.get("image_url") or None

                return {
                    "source": "geckoterminal",
                    "found": True,
                    "name": attr.get("name"),
                    "symbol": str(attr.get("symbol") or "").upper(),
                    "logo": logo,
                    "price": price_usd,
                    "priceUsd": price_usd,
                    "priceChange24h": 0.0,
                    "volume24h": volume_24h,
                    "liquidity": liquidity,
                    "marketCap": market_cap,
                    "verified": True
                }
    except Exception as e:
        logger.warning(f"[GeckoTerminal] Error fetching {contract_address}: {e}")

    return {"source": "geckoterminal", "found": False}
