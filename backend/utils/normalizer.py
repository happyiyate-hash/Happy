import re

CHAIN_MAP = {
    "1": {"id": "1", "name": "Ethereum Mainnet", "symbol": "ETH", "type": "evm", "coingecko_platform": "ethereum", "geckoterminal_network": "eth"},
    "ethereum": {"id": "1", "name": "Ethereum Mainnet", "symbol": "ETH", "type": "evm", "coingecko_platform": "ethereum", "geckoterminal_network": "eth"},
    "eth": {"id": "1", "name": "Ethereum Mainnet", "symbol": "ETH", "type": "evm", "coingecko_platform": "ethereum", "geckoterminal_network": "eth"},
    "137": {"id": "137", "name": "Polygon PoS", "symbol": "POL", "type": "evm", "coingecko_platform": "polygon-pos", "geckoterminal_network": "polygon_pos"},
    "polygon": {"id": "137", "name": "Polygon PoS", "symbol": "POL", "type": "evm", "coingecko_platform": "polygon-pos", "geckoterminal_network": "polygon_pos"},
    "8453": {"id": "8453", "name": "Base Network", "symbol": "ETH", "type": "evm", "coingecko_platform": "base", "geckoterminal_network": "base"},
    "base": {"id": "8453", "name": "Base Network", "symbol": "ETH", "type": "evm", "coingecko_platform": "base", "geckoterminal_network": "base"},
    "56": {"id": "56", "name": "BNB Smart Chain", "symbol": "BNB", "type": "evm", "coingecko_platform": "binance-smart-chain", "geckoterminal_network": "bsc"},
    "bsc": {"id": "56", "name": "BNB Smart Chain", "symbol": "BNB", "type": "evm", "coingecko_platform": "binance-smart-chain", "geckoterminal_network": "bsc"},
    "42161": {"id": "42161", "name": "Arbitrum One", "symbol": "ETH", "type": "evm", "coingecko_platform": "arbitrum-one", "geckoterminal_network": "arbitrum"},
    "arbitrum": {"id": "42161", "name": "Arbitrum One", "symbol": "ETH", "type": "evm", "coingecko_platform": "arbitrum-one", "geckoterminal_network": "arbitrum"},
    "solana": {"id": "solana", "name": "Solana", "symbol": "SOL", "type": "solana", "coingecko_platform": "solana", "geckoterminal_network": "solana"},
    "sol": {"id": "solana", "name": "Solana", "symbol": "SOL", "type": "solana", "coingecko_platform": "solana", "geckoterminal_network": "solana"}
}

DEFAULT_CHAIN = {"id": "1", "name": "Ethereum Mainnet", "symbol": "ETH", "type": "evm", "coingecko_platform": "ethereum", "geckoterminal_network": "eth"}

def normalize_chain(chain_identifier: str) -> dict:
    if not chain_identifier:
        return DEFAULT_CHAIN
    
    key = str(chain_identifier).lower().strip()
    return CHAIN_MAP.get(key, DEFAULT_CHAIN)

def normalize_address(address: str, chain_type: str = "evm") -> str:
    if not address:
        return ""
    
    cleaned = address.strip()
    if chain_type == "evm" and cleaned.startswith("0x"):
        return cleaned.lower()
    return cleaned

def is_valid_address(address: str, chain_type: str = "evm") -> bool:
    if not address or len(address) < 3:
        return False
    
    if chain_type == "evm":
        return bool(re.match(r"^0x[a-fA-F0-9]{40}$", address.strip()))
    elif chain_type == "solana":
        return len(address.strip()) >= 32 and len(address.strip()) <= 44
    
    return True
