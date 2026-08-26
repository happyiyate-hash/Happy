import time

_CACHE_STORE = {}

def get_cache(prefix: str, chain: str, contract_address: str, ttl_seconds: int = 60):
    """
    Retrieves item from in-memory TTL cache with namespace key:
    f"{prefix}:{chain.lower()}:{contract_address.lower()}"
    """
    key = f"{prefix}:{str(chain).lower().strip()}:{str(contract_address).lower().strip()}"
    entry = _CACHE_STORE.get(key)
    if entry:
        now = time.time()
        if (now - entry["timestamp"]) < ttl_seconds:
            return entry["data"]
    return None

def set_cache(prefix: str, chain: str, contract_address: str, data: dict):
    """
    Sets item in in-memory TTL cache with namespace key.
    """
    key = f"{prefix}:{str(chain).lower().strip()}:{str(contract_address).lower().strip()}"
    _CACHE_STORE[key] = {
        "timestamp": time.time(),
        "data": data
    }

def clear_cache():
    """
    Utility to clear cache store.
    """
    _CACHE_STORE.clear()
