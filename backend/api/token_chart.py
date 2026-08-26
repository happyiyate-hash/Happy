from http.server import BaseHTTPRequestHandler
import json
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from services.chart_service import get_token_chart_service
    from models.token_models import build_error_response
except ImportError:
    from ..services.chart_service import get_token_chart_service
    from ..models.token_models import build_error_response

class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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

        chain = body.get('chain') or body.get('chainId') or 'ethereum'
        contract_address = body.get('contractAddress') or body.get('address') or ''
        interval = body.get('interval') or '1h'
        limit = body.get('limit') or 100

        if not contract_address:
            err, status = build_error_response(
                code="MISSING_CONTRACT_ADDRESS",
                message="Field 'contractAddress' is required in request body."
            )
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(err).encode('utf-8'))
            return

        result, status_code = get_token_chart_service(str(chain), str(contract_address), str(interval), limit)

        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))

    def do_GET(self):
        self.do_POST()
