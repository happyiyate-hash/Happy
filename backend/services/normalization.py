import re

CHAIN_MAP = {
    "1": {"id": "1", "name": "Ethereum Mainnet", "symbol": "ETH", "type": "evm", "trust_platform": "ethereum"},
    "ethereum": {"id": "1", "name": "Ethereum Mainnet", "symbol": "ETH", "type": "evm", "trust_platform": "ethereum"},
    "137": {"id": "137", "name": "Polygon PoS", "symbol": "POL", "type": "evm", "trust_platform": "polygon"},
    "polygon": {"id": "137", "name": "Polygon PoS", "symbol": "POL", "type": "evm", "trust_platform": "polygon"},
    "8453": {"id": "8453", "name": "Base Network", "symbol": "ETH", "type": "evm", "trust_platform": "base"},
    "base": {"id": "8453", "name": "Base Network", "symbol": "ETH", "type": "evm", "trust_platform": "base"},
    "56": {"id": "56", "name": "BNB Smart Chain", "symbol": "BNB", "type": "evm", "trust_platform": "binance"},
    "bsc": {"id": "56", "name": "BNB Smart Chain", "symbol": "BNB", "type": "evm", "trust_platform": "binance"},
    "42161": {"id": "42161", "name": "Arbitrum One", "symbol": "ETH", "type": "evm", "trust_platform": "arbitrum"},
    "arbitrum": {"id": "42161", "name": "Arbitrum One", "symbol": "ETH", "type": "evm", "trust_platform": "arbitrum"},
    "solana": {"id": "solana", "name": "Solana", "symbol": "SOL", "type": "solana", "trust_platform": "solana"},
    "ton": {"id": "ton", "name": "TON Network", "symbol": "TON", "type": "ton", "trust_platform": "ton"},
    "xrpl": {"id": "xrpl", "name": "XRP Ledger", "symbol": "XRP", "type": "xrpl", "trust_platform": "ripple"}
}

DEFAULT_CHAIN = {"id": "137", "name": "Polygon PoS", "symbol": "POL", "type": "evm", "trust_platform": "polygon"}

def normalize_chain(chain_identifier) -> dict:
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
    elif chain_type == "ton":
        return len(address.strip()) >= 24
    
    return True
