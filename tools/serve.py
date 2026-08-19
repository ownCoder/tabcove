#!/usr/bin/env python3
"""Tiny static server for local QA and screenshot rendering.

    python tools/serve.py [port]

Serves the project root so tools/shots.html can pull in the real extension
stylesheets. Development only — nothing here ships.
"""

import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8777


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # No caching, so a reload always shows the file just written.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving {ROOT} at http://127.0.0.1:{PORT}/")
        httpd.serve_forever()
