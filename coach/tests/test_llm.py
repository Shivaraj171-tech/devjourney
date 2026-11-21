"""OllamaLLM against a tiny local stand-in HTTP server (NOT a real Ollama).

These check that we send the request fields documented in Ollama's api.md and
read ``message.content`` back, and that failures become a status message.
"""

import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

from coach.cards import CARD_SCHEMA
from coach.llm import LLMUnavailable, OllamaLLM


class Handler(BaseHTTPRequestHandler):
    requests: list = []
    mode = "ok"

    def log_message(self, *a):
        pass

    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/version":
            self._send(200, {"version": "0.0-test"})
        elif self.path == "/api/tags":
            self._send(200, {"models": [{"name": "qwen-test:latest"}]})
        else:
            self._send(404, {"error": "nope"})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        Handler.requests.append(body)
        if Handler.mode == "nothink" and "think" in body:
            return self._send(400, {"error": "\"qwen-test\" does not support thinking"})
        if Handler.mode == "missing":
            return self._send(404, {"error": "model 'qwen-test' not found"})
        self._send(200, {"model": body["model"], "message": {"role": "assistant", "content": '{"ok": true}'},
                         "done": True, "done_reason": "stop"})


class OllamaClientTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), Handler)
        cls.url = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def setUp(self):
        Handler.requests = []
        Handler.mode = "ok"

    def test_request_shape(self):
        llm = OllamaLLM("qwen-test", self.url, timeout=5, temperature=0.1)
        out = llm.complete([{"role": "user", "content": "hi"}], CARD_SCHEMA)
        self.assertEqual(json.loads(out), {"ok": True})
        req = Handler.requests[0]
        self.assertEqual(req["model"], "qwen-test")
        self.assertIs(req["stream"], False)
        self.assertEqual(req["format"], CARD_SCHEMA)
        self.assertEqual(req["options"]["temperature"], 0.1)
        self.assertIs(req["think"], False)
        self.assertEqual(req["messages"][0], {"role": "user", "content": "hi"})

    def test_retry_without_think_flag(self):
        Handler.mode = "nothink"
        out = OllamaLLM("qwen-test", self.url, timeout=5).complete([], CARD_SCHEMA)
        self.assertEqual(json.loads(out), {"ok": True})
        self.assertNotIn("think", Handler.requests[-1])

    def test_missing_model(self):
        Handler.mode = "missing"
        with self.assertRaises(LLMUnavailable) as cm:
            OllamaLLM("qwen-test", self.url, timeout=5).complete([], CARD_SCHEMA)
        self.assertIn("ollama pull qwen-test", str(cm.exception))

    def test_not_running(self):
        with self.assertRaises(LLMUnavailable) as cm:
            OllamaLLM("m", "http://127.0.0.1:9", timeout=2).complete([], CARD_SCHEMA)
        self.assertIn("not reachable", str(cm.exception))

    def test_health(self):
        self.assertTrue(OllamaLLM("qwen-test", self.url).health()[0])
        ok, msg = OllamaLLM("other", self.url).health()
        self.assertFalse(ok)
        self.assertIn("ollama pull other", msg)


if __name__ == "__main__":
    unittest.main()
