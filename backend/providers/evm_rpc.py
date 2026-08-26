import requests
import logging

logger = logging.getLogger("tokencare-evm-rpc")
REQUEST_TIMEOUT = 3.5

RPC_URLS = {
    "1": "https://eth.llamarpc.com",
    "137": "https://polygon-bor-rpc.publicnode.com",
    "8453": "https://mainnet.base.org",
    "56": "https://bsc-dataseed.binance.org",
    "42161": "https://arb1.arbitrum.io/rpc"
}

def fetch_evm_rpc_token(contract_address: str, chain_id: str) -> dict:
    """
    Fetches ERC-20 metadata directly from public EVM JSON-RPC nodes
    """
    rpc_url = RPC_URLS.get(str(chain_id))
    if not rpc_url:
        return {"source": "evm_rpc", "found": False}

    try:
        payloads = [
            {"jsonrpc": "2.0", "id": 1, "method": "eth_call", "params": [{"to": contract_address, "data": "0x06fdde03"}, "latest"]}, # name()
            {"jsonrpc": "2.0", "id": 2, "method": "eth_call", "params": [{"to": contract_address, "data": "0x95d89b41"}, "latest"]}, # symbol()
            {"jsonrpc": "2.0", "id": 3, "method": "eth_call", "params": [{"to": contract_address, "data": "0x313ce567"}, "latest"]}  # decimals()
        ]

        resp = requests.post(rpc_url, json=payloads, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            results = resp.json()
            if isinstance(results, list) and len(results) == 3:
                name_hex = results[0].get("result", "")
                symbol_hex = results[1].get("result", "")
                decimals_hex = results[2].get("result", "")

                def parse_hex_str(hex_str):
                    if not hex_str or hex_str == "0x":
                        return None
                    try:
                        clean = hex_str[2:]
                        if len(clean) > 128:
                            length = int(clean[64:128], 16)
                            raw_bytes = bytes.fromhex(clean[128:128 + length * 2])
                            return raw_bytes.decode('utf-8', errors='ignore').strip('\x00')
                        else:
                            raw_bytes = bytes.fromhex(clean)
                            return raw_bytes.decode('utf-8', errors='ignore').strip('\x00')
                    except Exception:
                        return None

                name = parse_hex_str(name_hex)
                symbol = parse_hex_str(symbol_hex)
                decimals = int(decimals_hex, 16) if decimals_hex and decimals_hex != "0x" else 18

                if name or symbol:
                    return {
                        "source": "evm_rpc",
                        "found": True,
                        "name": name or symbol or "ERC-20 Token",
                        "symbol": str(symbol or name or "TOK").upper(),
                        "decimals": decimals,
                        "logo": None,
                        "price": 0.0,
                        "priceUsd": 0.0,
                        "verified": True
                    }
    except Exception as e:
        logger.warning(f"[EVM RPC] Error fetching {contract_address}: {e}")

    return {"source": "evm_rpc", "found": False}
