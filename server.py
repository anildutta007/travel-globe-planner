"""
Dutta Travel Planner - Interactive 3D World Globe, Cost Estimator & Itinerary Planner
Developed by Anil Dutta (Anildutta007@gmail.com)
Local Web & API Server (Port 8098)
"""

import os
import sys
import json
import urllib.parse
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

PORT = int(os.environ.get("PORT", 8098))
HOST = "127.0.0.1"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
}


class TravelGlobeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            return self._send_json({
                "status": "ok",
                "service": "Dutta Travel Planner",
                "developer": "Anil Dutta",
                "email": "Anildutta007@gmail.com",
                "port": PORT
            })

        if path in ("/", "/index.html"):
            file_path = os.path.join(BASE_DIR, "index.html")
        else:
            safe_rel = os.path.normpath(path.lstrip("/"))
            if safe_rel.startswith(".."):
                self.send_error(403, "Forbidden")
                return
            file_path = os.path.join(BASE_DIR, safe_rel)

        if not os.path.isfile(file_path):
            self.send_error(404, "File Not Found")
            return

        _, ext = os.path.splitext(file_path)
        content_type = MIME_TYPES.get(ext.lower(), "application/octet-stream")

        try:
            with open(file_path, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))


def main():
    url = f"http://{HOST}:{PORT}"
    server = HTTPServer((HOST, PORT), TravelGlobeHandler)
    print("======================================================================")
    print("  Dutta Travel Planner - Interactive 3D World Globe & AI Planner")
    print("  Developer: Anil Dutta (Anildutta007@gmail.com)")
    print(f"  Server running at: {url}")
    print("======================================================================")
    if "--no-browser" not in sys.argv:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.server_close()


if __name__ == "__main__":
    main()
