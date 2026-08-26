import os
import requests
import logging

logger = logging.getLogger("tokencare-coingecko")
REQUEST_TIMEOUT = 4.0

def fetch_coingecko_token(contract_address: str, platform_id: str) -> dict:
    """
    Fetches token data from CoinGecko Contract API
    """
    api_key = os.getenv("COINGECKO_API_KEY", "")
    headers = {}
    if api_key:
        headers["x-cg-demo-api-key"] = api_key

    try:
        url = f"https://api.coingecko.com/api/v3/coins/{platform_id}/contract/{contract_address.lower()}"
        resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            market_data = data.get("market_data", {})
            image_data = data.get("image", {})

            price = float((market_data.get("current_price") or {}).get("usd") or 0.0)
            price_change = float(market_data.get("price_change_percentage_24h") or 0.0)
            market_cap = float((market_data.get("market_cap") or {}).get("usd") or 0.0)
            logo = image_data.get("large") or image_data.get("small") or None

            return {
                "source": "coingecko",
                "found": True,
                "name": data.get("name"),
                "symbol": str(data.get("symbol") or "").upper(),
                "logo": logo,
                "price": price,
                "priceUsd": price,
                "priceChange24h": price_change,
                "marketCap": market_cap,
                "volume24h": float((market_data.get("total_volume") or {}).get("usd") or 0.0),
                "verified": True
            }
    except Exception as e:
        logger.warning(f"[CoinGecko] Error fetching {contract_address}: {e}")

    return {"source": "coingecko", "found": False}
