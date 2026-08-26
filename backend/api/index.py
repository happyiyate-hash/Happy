from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()

        res = {
            "service": "TokenCare Vercel API",
            "version": "1.0.0",
            "endpoints": [
                "/api/health",
                "/api/token/details",
                "/api/token/price",
                "/api/tokens/prices",
                "/api/token/chart"
            ]
        }
        self.wfile.write(json.dumps(res).encode('utf-8'))
