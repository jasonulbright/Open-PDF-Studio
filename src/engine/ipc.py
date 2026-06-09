"""
JSON-RPC 2.0 protocol handler for stdin/stdout communication.
"""

import json
import sys
from typing import Any, Callable, TextIO


class JsonRpcServer:
    """Minimal JSON-RPC 2.0 server over stdin/stdout."""

    def __init__(self) -> None:
        self._methods: dict[str, Callable[..., Any]] = {}

    def register(self, name: str, handler: Callable[..., Any]) -> None:
        self._methods[name] = handler

    def run(self, input_stream: TextIO, output_stream: TextIO) -> None:
        for line in input_stream:
            line = line.strip()
            if not line:
                continue
            try:
                request = json.loads(line)
                response = self._handle(request)
                if response is not None:
                    output_stream.write(json.dumps(response) + "\n")
                    output_stream.flush()
            except json.JSONDecodeError:
                self._write_error(output_stream, None, -32700, "Parse error")

    def _handle(self, request: dict[str, Any]) -> dict[str, Any] | None:
        req_id = request.get("id")
        method = request.get("method", "")
        params = request.get("params", {})

        if method not in self._methods:
            return {
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": f"Method not found: {method}"},
                "id": req_id,
            }

        try:
            result = self._methods[method](**params)
            return {"jsonrpc": "2.0", "result": result, "id": req_id}
        except Exception as exc:
            return {
                "jsonrpc": "2.0",
                "error": {"code": -32000, "message": str(exc)},
                "id": req_id,
            }

    @staticmethod
    def _write_error(
        stream: TextIO, req_id: Any, code: int, message: str
    ) -> None:
        response = {
            "jsonrpc": "2.0",
            "error": {"code": code, "message": message},
            "id": req_id,
        }
        stream.write(json.dumps(response) + "\n")
        stream.flush()
