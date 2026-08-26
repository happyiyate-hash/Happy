def build_token_response(
    name=None,
    symbol=None,
    contract_address=None,
    chain="ethereum",
    decimals=18,
    logo=None,
    price=0.0,
    price_usd=0.0,
    market_cap=0.0,
    liquidity=0.0,
    volume_24h=0.0,
    price_change_24h=0.0,
    verified=False
):
    """
    Returns normalized token details dictionary matching the Vercel API specification:
    Do not invent values. If a provider doesn't have a field, return null.
    """
    return {
        "success": True,
        "token": {
            "name": name,
            "symbol": symbol.upper() if symbol else None,
            "contractAddress": contract_address,
            "chain": chain,
            "decimals": decimals,
            "logo": logo if logo else None,
            "price": price if price is not None else 0.0,
            "priceUsd": price_usd if price_usd is not None else (price if price else 0.0),
            "marketCap": market_cap if market_cap else None,
            "liquidity": liquidity if liquidity else None,
            "volume24h": volume_24h if volume_24h else None,
            "priceChange24h": price_change_24h if price_change_24h is not None else 0.0,
            "verified": bool(verified)
        }
    }

def build_error_response(code="TOKEN_NOT_FOUND", message="Unable to resolve token from the configured providers.", status_code=400):
    """
    Standardized JSON error format:
    {
      "success": false,
      "error": {
        "code": "TOKEN_NOT_FOUND",
        "message": "Unable to resolve token from the configured providers."
      }
    }
    """
    return {
        "success": False,
        "error": {
          "code": code,
          "message": message
        }
    }, status_code
