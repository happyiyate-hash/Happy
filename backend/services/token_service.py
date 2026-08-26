from ..utils.normalizer import normalize_chain, normalize_address, is_valid_address
from ..utils.cache import get_cache, set_cache
from ..models.token_models import build_token_response, build_error_response
from .provider_router import query_all_providers_parallel

def get_token_details_service(chain_identifier: str, contract_address: str):
    chain_info = normalize_chain(chain_identifier)
    clean_address = normalize_address(contract_address, chain_info["type"])

    if not is_valid_address(clean_address, chain_info["type"]):
        return build_error_response(
            code="INVALID_ADDRESS",
            message="Invalid contract address provided for the specified blockchain network."
        )

    cache_key_chain = chain_info["id"]
    cached = get_cache("token_details", cache_key_chain, clean_address, ttl_seconds=3600)
    if cached:
        return cached, 200

    aggregated = query_all_providers_parallel(clean_address, chain_info)
    if not aggregated.get("found"):
        return build_error_response(
            code="TOKEN_NOT_FOUND",
            message="Unable to resolve token from the configured providers."
        )

    # Standardized response format matching prompt
    chain_name = chain_identifier.lower().strip() if chain_identifier else "ethereum"
    if chain_name in ["1", "eth"]:
        chain_name = "ethereum"
    elif chain_name in ["137", "pol"]:
        chain_name = "polygon"
    elif chain_name in ["8453"]:
        chain_name = "base"

    res = build_token_response(
        name=aggregated.get("name"),
        symbol=aggregated.get("symbol"),
        contract_address=clean_address,
        chain=chain_name,
        decimals=aggregated.get("decimals", 18),
        logo=aggregated.get("logo"),
        price=aggregated.get("price", 0.0),
        price_usd=aggregated.get("priceUsd", 0.0),
        market_cap=aggregated.get("marketCap"),
        liquidity=aggregated.get("liquidity"),
        volume_24h=aggregated.get("volume24h"),
        price_change_24h=aggregated.get("priceChange24h", 0.0),
        verified=aggregated.get("verified", False)
    )

    set_cache("token_details", cache_key_chain, clean_address, res)
    return res, 200
