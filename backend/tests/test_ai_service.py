import asyncio

import httpx
import pytest

from app.ai_service import (
    OllamaResponseError,
    OllamaUnavailableError,
    explain_with_ollama,
)


def mock_transport(handler):
    original = httpx.AsyncClient

    class PatchedAsyncClient(original):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, transport=httpx.MockTransport(handler), **kwargs)

    return PatchedAsyncClient


def test_successful_ollama_response(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == httpx.URL("http://localhost:11434/api/chat")
        body = {
            "message": {
                "role": "assistant",
                "content": "Actual Impact\nThis is a heuristic explanation.",
            }
        }
        return httpx.Response(200, json=body)

    monkeypatch.setattr(
        "app.ai_service.httpx.AsyncClient",
        mock_transport(handler),
    )

    explanation, model = asyncio.run(explain_with_ollama({"event": {"title": "Test"}}))

    assert model == "qwen2.5:3b"
    assert "Actual Impact" in explanation


def test_missing_model(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": "model not found"})

    monkeypatch.setattr(
        "app.ai_service.httpx.AsyncClient",
        mock_transport(handler),
    )

    with pytest.raises(OllamaResponseError, match="model"):
        asyncio.run(explain_with_ollama({"event": {"title": "Test"}}))


def test_unavailable_ollama(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    monkeypatch.setattr(
        "app.ai_service.httpx.AsyncClient",
        mock_transport(handler),
    )

    with pytest.raises(OllamaUnavailableError, match="unavailable"):
        asyncio.run(explain_with_ollama({"event": {"title": "Test"}}))


def test_timeout(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    monkeypatch.setattr(
        "app.ai_service.httpx.AsyncClient",
        mock_transport(handler),
    )

    with pytest.raises(OllamaUnavailableError, match="timeout"):
        asyncio.run(explain_with_ollama({"event": {"title": "Test"}}))


def test_malformed_response(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected": "shape"})

    monkeypatch.setattr(
        "app.ai_service.httpx.AsyncClient",
        mock_transport(handler),
    )

    with pytest.raises(OllamaResponseError, match="malformed"):
        asyncio.run(explain_with_ollama({"event": {"title": "Test"}}))
