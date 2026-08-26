from http.server import BaseHTTPRequestHandler
import json
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from services.pricing import get_batch_token_prices
except ImportError:
    from ..services.pricing import get_batch_token_prices

class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'

        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            body = {}

        tokens = body.get('tokens')
        if not tokens or not isinstance(tokens, list):
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            err_res = {
                "success": False,
                "error": "Missing or invalid 'tokens' array in request body.",
                "results": []
            }
            self.wfile.write(json.dumps(err_res).encode('utf-8'))
            return

        result = get_batch_token_prices(tokens)
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))

    def do_GET(self):
        self.send_response(405)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        err_res = {"success": False, "error": "HTTP GET not supported for batch prices. Use POST with JSON body."}
        self.wfile.write(json.dumps(err_res).encode('utf-8'))
