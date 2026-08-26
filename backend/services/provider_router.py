from concurrent.futures import ThreadPoolExecutor, as_completed
from ..providers.dexscreener import fetch_dexscreener_token
from ..providers.coingecko import fetch_coingecko_token
from ..providers.geckoterminal import fetch_geckoterminal_token
from ..providers.evm_rpc import fetch_evm_rpc_token
from ..services.logo_service import resolve_logo

def query_all_providers_parallel(contract_address: str, chain_info: dict) -> dict:
    """
    Executes multiple configured providers in parallel:
    - DexScreener
    - CoinGecko
    - GeckoTerminal
    - EVM RPC (if EVM)
    Aggregates best available data without failing if one provider is down.
    """
    chain_id = chain_info["id"]
    coingecko_platform = chain_info["coingecko_platform"]
    geckoterminal_network = chain_info["geckoterminal_network"]

    futures = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures[executor.submit(fetch_dexscreener_token, contract_address, chain_id)] = "dexscreener"
        futures[executor.submit(fetch_coingecko_token, contract_address, coingecko_platform)] = "coingecko"
        futures[executor.submit(fetch_geckoterminal_token, contract_address, geckoterminal_network)] = "geckoterminal"
        if chain_info["type"] == "evm":
            futures[executor.submit(fetch_evm_rpc_token, contract_address, chain_id)] = "evm_rpc"

    results = {}
    for future in as_completed(futures):
        provider_name = futures[future]
        try:
            res = future.result()
            results[provider_name] = res
        except Exception:
            results[provider_name] = {"source": provider_name, "found": False}

    # Aggregate best available attributes across successful providers
    dex = results.get("dexscreener", {})
    cg = results.get("coingecko", {})
    gt = results.get("geckoterminal", {})
    rpc = results.get("evm_rpc", {})

    has_found = dex.get("found") or cg.get("found") or gt.get("found") or rpc.get("found")
    if not has_found:
        return {"found": False}

    name = dex.get("name") or cg.get("name") or gt.get("name") or rpc.get("name") or "Verified Token"
    symbol = dex.get("symbol") or cg.get("symbol") or gt.get("symbol") or rpc.get("symbol") or "TOKEN"
    decimals = rpc.get("decimals") or 18

    # Logo resolution
    candidate_logos = [dex.get("logo"), cg.get("logo"), gt.get("logo")]
    resolved_logo = resolve_logo(contract_address, chain_id, candidate_logos)

    price_usd = dex.get("priceUsd") or cg.get("priceUsd") or gt.get("priceUsd") or 0.0
    price_change_24h = dex.get("priceChange24h") or cg.get("priceChange24h") or 0.0
    market_cap = cg.get("marketCap") or dex.get("marketCap") or gt.get("marketCap") or None
    liquidity = dex.get("liquidity") or gt.get("liquidity") or None
    volume_24h = dex.get("volume24h") or cg.get("volume24h") or gt.get("volume24h") or None

    return {
        "found": True,
        "name": name,
        "symbol": symbol,
        "contractAddress": contract_address,
        "chain": chain_info["coingecko_platform"] if chain_info["coingecko_platform"] != "polygon-pos" else "polygon",
        "decimals": decimals,
        "logo": resolved_logo,
        "price": price_usd,
        "priceUsd": price_usd,
        "marketCap": market_cap,
        "liquidity": liquidity,
        "volume24h": volume_24h,
        "priceChange24h": price_change_24h,
        "verified": True
    }
