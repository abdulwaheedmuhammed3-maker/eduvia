"""Local static-file server for Eduvia development."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class EduviaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if any(part.startswith(".") for part in self.path.split("?", 1)[0].split("/")):
            self.send_error(404)
            return
        super().do_GET()


if __name__ == "__main__":
    address = ("127.0.0.1", 8000)
    print(f"Eduvia is available at http://{address[0]}:{address[1]} (Ctrl+C to stop).")
    ThreadingHTTPServer(address, EduviaHandler).serve_forever()
