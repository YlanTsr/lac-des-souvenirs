"""
Petit serveur local SANS cache (pratique pendant que tu modifies les fichiers).

    python tools/serve.py          → http://localhost:8080
    python tools/serve.py 9000     → autre port

Équivaut à `python -m http.server`, mais force le navigateur à recharger
les fichiers JS / JSON à chaque fois (plus besoin de Ctrl+F5).
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".mjs": "text/javascript"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler) as httpd:
        # ASCII uniquement : la console Windows (cp1252) refuse certains caractères
        print(f"Les 55 Lanternes : http://localhost:{PORT}  (Ctrl+C pour arreter)", flush=True)
        httpd.serve_forever()
