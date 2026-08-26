import time
from concurrent.futures import ThreadPoolExecutor
from ..utils.normalizer import normalize_chain, normalize_address, is_valid_address
from ..utils.cache import get_cache, set_cache
from ..models.token_models import build_error_response
from .provider_router import query_all_providers_parallel

def get_token_price_service(chain_identifier: str, contract_address: str):
    chain_info = normalize_chain(chain_identifier)
    clean_address = normalize_address(contract_address, chain_info["type"])

    if not is_valid_address(clean_address, chain_info["type"]):
        return build_error_response(
            code="INVALID_ADDRESS",
            message="Invalid contract address provided."
        )

    chain_name = chain_identifier.lower().strip() if chain_identifier else "ethereum"
    if chain_name in ["1", "eth"]:
        chain_name = "ethereum"
    elif chain_name in ["137"]:
        chain_name = "polygon"
    elif chain_name in ["8453"]:
        chain_name = "base"

    cache_key_chain = chain_info["id"]
    cached = get_cache("token_price", cache_key_chain, clean_address, ttl_seconds=60)
    if cached:
        return cached, 200

    aggregated = query_all_providers_parallel(clean_address, chain_info)

    res = {
        "success": True,
        "chain": chain_name,
        "contractAddress": clean_address,
        "priceUsd": aggregated.get("priceUsd", 0.0) if aggregated.get("found") else 0.0,
        "priceChange24h": aggregated.get("priceChange24h", 0.0) if aggregated.get("found") else 0.0,
        "timestamp": int(time.time())
    }

    set_cache("token_price", cache_key_chain, clean_address, res)
    return res, 200


def _batch_worker(token_item: dict):
    chain_id = token_item.get("chain") or token_item.get("chainId") or "ethereum"
    addr = token_item.get("contractAddress") or token_item.get("address") or ""

    res, _ = get_token_price_service(str(chain_id), str(addr))
    if res.get("success"):
        return {
            "chain": res.get("chain"),
            "contractAddress": res.get("contractAddress"),
            "priceUsd": res.get("priceUsd", 0.0),
            "priceChange24h": res.get("priceChange24h", 0.0)
        }
    return {
        "chain": str(chain_id).lower(),
        "contractAddress": str(addr).lower(),
        "priceUsd": 0.0,
        "priceChange24h": 0.0
    }


def get_batch_token_prices_service(tokens: list):
    if not tokens or not isinstance(tokens, list):
        return build_error_response(
            code="INVALID_PAYLOAD",
            message="Field 'tokens' must be a non-empty array of token objects."
        )

    max_workers = min(12, max(1, len(tokens)))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(_batch_worker, tokens))

    return {
        "success": True,
        "results": results,
        "timestamp": int(time.time())
    }, 200
