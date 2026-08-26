import requests
import logging

logger = logging.getLogger("tokencare-providers")
logger.setLevel(logging.INFO)

REQUEST_TIMEOUT = 5.0  # Seconds timeout for external API calls

def fetch_dexscreener_pair(address: str, chain_id: str) -> dict:
    """
    Provider A: DexScreener API for price, liquidity, volume, pairs and token metadata
    """
    try:
        url = f"https://api.dexscreener.com/latest/dex/tokens/{address}"
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            pairs = data.get("pairs")
            if pairs and len(pairs) > 0:
                # Prefer pair matching chain or highest liquidity pair
                best_pair = pairs[0]
                for p in pairs:
                    if str(p.get("chainId", "")).lower() == str(chain_id).lower():
                        best_pair = p
                        break
                
                base_token = best_pair.get("baseToken", {})
                price_usd = float(best_pair.get("priceUsd") or 0)
                price_native = float(best_pair.get("priceNative") or 0)
                price_change = float((best_pair.get("priceChange") or {}).get("h24") or 0)
                volume_24h = float((best_pair.get("volume") or {}).get("h24") or 0)
                liquidity_usd = float((best_pair.get("liquidity") or {}).get("usd") or 0)
                fdv = float(best_pair.get("fdv") or 0)
                
                info = best_pair.get("info", {})
                logo_url = info.get("imageUrl") or ""

                return {
                    "source": "dexscreener",
                    "found": True,
                    "name": base_token.get("name"),
                    "symbol": base_token.get("symbol"),
                    "address": base_token.get("address") or address,
                    "priceUsd": price_usd,
                    "priceNative": price_native,
                    "priceChange24h": price_change,
                    "volume24h": volume_24h,
                    "liquidityUsd": liquidity_usd,
                    "fdvUsd": fdv,
                    "logoUrl": logo_url,
                    "pairAddress": best_pair.get("pairAddress"),
                    "dexId": best_pair.get("dexId")
                }
    except Exception as e:
        logger.warning(f"[DexScreener] Error fetching {address}: {e}")
    
    return {"source": "dexscreener", "found": False}


def fetch_coingecko_contract_data(address: str, platform_id: str) -> dict:
    """
    Provider B: CoinGecko Contract API for token metadata, market cap, and supply data
    """
    try:
        url = f"https://api.coingecko.com/api/v3/coins/{platform_id}/contract/{address.lower()}"
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            market_data = data.get("market_data", {})
            image_data = data.get("image", {})
            
            return {
                "source": "coingecko",
                "found": True,
                "name": data.get("name"),
                "symbol": str(data.get("symbol") or "").upper(),
                "logoUrl": image_data.get("large") or image_data.get("small"),
                "priceUsd": float((market_data.get("current_price") or {}).get("usd") or 0),
                "priceChange24h": float(market_data.get("price_change_percentage_24h") or 0),
                "marketCapUsd": float((market_data.get("market_cap") or {}).get("usd") or 0),
                "totalSupply": market_data.get("total_supply"),
                "circulatingSupply": market_data.get("circulating_supply")
            }
    except Exception as e:
        logger.warning(f"[CoinGecko] Error fetching {address}: {e}")
        
    return {"source": "coingecko", "found": False}


def fetch_evm_rpc_metadata(address: str, chain_id: str) -> dict:
    """
    Provider C: Direct Public RPC JSON-RPC queries for ERC-20 contract metadata (name, symbol, decimals)
    """
    rpc_urls = {
        "1": "https://eth.llamarpc.com",
        "137": "https://polygon-bor-rpc.publicnode.com",
        "8453": "https://mainnet.base.org",
        "56": "https://bsc-dataseed.binance.org",
        "42161": "https://arb1.arbitrum.io/rpc"
    }
    
    rpc_url = rpc_urls.get(str(chain_id))
    if not rpc_url:
        return {"source": "evm_rpc", "found": False}

    try:
        # Standard ERC-20 function selectors
        # name() = 0x06fdde03
        # symbol() = 0x95d89b41
        # decimals() = 0x313ce567
        
        payloads = [
            {"jsonrpc": "2.0", "id": 1, "method": "eth_call", "params": [{"to": address, "data": "0x06fdde03"}, "latest"]},
            {"jsonrpc": "2.0", "id": 2, "method": "eth_call", "params": [{"to": address, "data": "0x95d89b41"}, "latest"]},
            {"jsonrpc": "2.0", "id": 3, "method": "eth_call", "params": [{"to": address, "data": "0x313ce567"}, "latest"]}
        ]
        
        resp = requests.post(rpc_url, json=payloads, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            results = resp.json()
            if isinstance(results, list) and len(results) == 3:
                name_hex = results[0].get("result", "")
                symbol_hex = results[1].get("result", "")
                decimals_hex = results[2].get("result", "")
                
                def parse_string_hex(hex_str):
                    if not hex_str or hex_str == "0x":
                        return None
                    try:
                        clean = hex_str[2:]
                        if len(clean) > 128:
                            # Standard string return format
                            length = int(clean[64:128], 16)
                            raw_bytes = bytes.fromhex(clean[128:128 + length * 2])
                            return raw_bytes.decode('utf-8', errors='ignore').strip('\x00')
                        else:
                            # Bytes32 string return format
                            raw_bytes = bytes.fromhex(clean)
                            return raw_bytes.decode('utf-8', errors='ignore').strip('\x00')
                    except Exception:
                        return None

                name = parse_string_hex(name_hex)
                symbol = parse_string_hex(symbol_hex)
                decimals = int(decimals_hex, 16) if decimals_hex and decimals_hex != "0x" else 18
                
                if name or symbol:
                    return {
                        "source": "evm_rpc",
                        "found": True,
                        "name": name or symbol or "ERC-20 Token",
                        "symbol": str(symbol or name or "TOK").upper(),
                        "decimals": decimals
                    }
    except Exception as e:
        logger.warning(f"[EVM RPC] Error fetching {address} on chain {chain_id}: {e}")

    return {"source": "evm_rpc", "found": False}


def fetch_geckoterminal_data(address: str, chain_id: str) -> dict:
    """
    Provider D: GeckoTerminal API for pool metrics and price reserves
    """
    try:
        network_map = {
            "1": "eth",
            "137": "polygon_pos",
            "8453": "base",
            "56": "bsc",
            "42161": "arbitrum"
        }
        network = network_map.get(str(chain_id), "polygon_pos")
        url = f"https://api.geckoterminal.com/api/v2/networks/{network}/tokens/{address.lower()}"
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            attr = data.get("data", {}).get("attributes", {})
            if attr:
                price_usd = float(attr.get("price_usd") or 0)
                volume_24h = float((attr.get("volume_usd") or {}).get("h24") or 0)
                reserve_usd = float(attr.get("total_reserve_in_usd") or 0)
                return {
                    "source": "geckoterminal",
                    "found": True,
                    "priceUsd": price_usd,
                    "volume24h": volume_24h,
                    "liquidityUsd": reserve_usd
                }
    except Exception as e:
        logger.warning(f"[GeckoTerminal] Error fetching {address}: {e}")

    return {"source": "geckoterminal", "found": False}


def fetch_goplus_security(address: str, chain_id: str) -> dict:
    """
    Provider E: GoPlus Security API for Honeypot, taxes, mintability, ownership status
    """
    try:
        url = f"https://api.gopluslabs.io/api/v1/token_security/{chain_id}?contract_addresses={address.lower()}"
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            result = data.get("result", {}).get(address.lower())
            if result:
                is_honeypot = result.get("is_honeypot") == "1"
                is_mintable = result.get("is_mintable") == "1"
                is_proxy = result.get("is_proxy") == "1"
                is_blacklisted = result.get("is_in_dex") == "0"
                buy_tax = float(result.get("buy_tax") or 0) * 100
                sell_tax = float(result.get("sell_tax") or 0) * 100
                owner_addr = result.get("owner_address", "")
                is_renounced = owner_addr == "0x0000000000000000000000000000000000000000" or not owner_addr

                return {
                    "source": "goplus",
                    "found": True,
                    "isHoneypot": is_honeypot,
                    "isMintable": is_mintable,
                    "isProxy": is_proxy,
                    "isBlacklisted": is_blacklisted,
                    "buyTaxPct": buy_tax,
                    "sellTaxPct": sell_tax,
                    "isRenounced": is_renounced
                }
    except Exception as e:
        logger.warning(f"[GoPlus] Error fetching {address}: {e}")

    return {
        "source": "goplus",
        "found": False,
        "isHoneypot": False,
        "isMintable": False,
        "isProxy": False,
        "isBlacklisted": False,
        "buyTaxPct": 0.0,
        "sellTaxPct": 0.0,
        "isRenounced": True
    }

