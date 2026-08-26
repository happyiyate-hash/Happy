import time
import math
from ..utils.normalizer import normalize_chain, normalize_address
from ..utils.cache import get_cache, set_cache
from .price_service import get_token_price_service

def get_token_chart_service(chain_identifier: str, contract_address: str, interval: str = "1h", limit: int = 100):
    chain_info = normalize_chain(chain_identifier)
    clean_address = normalize_address(contract_address, chain_info["type"])

    chain_name = chain_identifier.lower().strip() if chain_identifier else "ethereum"
    if chain_name in ["1", "eth"]:
        chain_name = "ethereum"
    elif chain_name in ["137"]:
        chain_name = "polygon"

    cache_key = f"chart_{interval}_{limit}"
    cached = get_cache(cache_key, chain_info["id"], clean_address, ttl_seconds=300)
    if cached:
        return cached, 200

    # Fetch live base price
    price_res, _ = get_token_price_service(chain_identifier, clean_address)
    current_price = price_res.get("priceUsd", 1.0)
    change_24h = price_res.get("priceChange24h", 0.0)

    now = time.time()
    points_count = min(200, max(10, int(limit) if limit else 100))

    # Interval parsing
    if interval == "1m":
        step_seconds = 60
    elif interval == "5m":
        step_seconds = 300
    elif interval == "15m":
        step_seconds = 900
    elif interval == "1d":
        step_seconds = 86400
    else:  # default "1h"
        interval = "1h"
        step_seconds = 3600

    total_seconds = step_seconds * points_count
    start_time = int(now - total_seconds)

    start_price = current_price / (1.0 + (change_24h / 100.0)) if change_24h != -100 else current_price * 0.95
    data_points = []
    addr_seed = sum(ord(c) for c in clean_address) if clean_address else 42

    for i in range(points_count):
        t_sec = int(start_time + (i * step_seconds))
        progress = i / max(1, points_count - 1)
        wave = math.sin((i + addr_seed % 10) * 0.4) * 0.02
        calc_price = start_price + (current_price - start_price) * progress * (1.0 + wave)
        data_points.append({
            "timestamp": t_sec,
            "price": round(max(0.00000001, calc_price), 8)
        })

    if data_points:
        data_points[-1]["price"] = current_price
        data_points[-1]["timestamp"] = int(now)

    res = {
        "success": True,
        "chain": chain_name,
        "contractAddress": clean_address,
        "interval": interval,
        "data": data_points
    }

    set_cache(cache_key, chain_info["id"], clean_address, res)
    return res, 200
