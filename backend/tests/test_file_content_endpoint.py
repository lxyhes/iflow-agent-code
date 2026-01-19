import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    from backend import server

    monkeypatch.setattr(server, "get_project_path", lambda project_name: str(tmp_path))
    return TestClient(server.app)


def test_file_content_endpoint_returns_bytes(client, tmp_path):
    target = tmp_path / "assets" / "hello.txt"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"hello")

    res = client.get("/api/projects/test_project/files/content", params={"filePath": "assets/hello.txt"})
    assert res.status_code == 200
    assert res.content == b"hello"
    assert "content-type" in res.headers


def test_file_content_endpoint_blocks_path_traversal(client, tmp_path):
    (tmp_path / "ok.txt").write_text("ok", encoding="utf-8")
    res = client.get("/api/projects/test_project/files/content", params={"filePath": "../ok.txt"})
    assert res.status_code in (403, 422)


def test_file_content_endpoint_blocks_outside_root(client, tmp_path):
    outside = tmp_path.parent / "outside.txt"
    outside.write_text("nope", encoding="utf-8")

    abs_outside = os.path.abspath(str(outside))
    res = client.get("/api/projects/test_project/files/content", params={"filePath": abs_outside})
    assert res.status_code in (403, 404)

