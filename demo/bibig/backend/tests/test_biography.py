import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.models.base import init_db, engine, Base


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    init_db()
    yield


async def create_authenticated_user(client: AsyncClient, name: str, prefix: str) -> tuple[str, dict]:
    email = f"{prefix}-{uuid.uuid4()}@example.com"
    password = "demo123"
    user_resp = await client.post(
        "/api/users/",
        json={"name": name, "email": email, "password": password},
    )
    assert user_resp.status_code == 200
    user_id = user_resp.json()["id"]

    login_resp = await client.post(
        "/api/users/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return user_id, headers


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_create_user_and_biography():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        user_id, headers = await create_authenticated_user(client, "测试用户", "test")

        bio_resp = await client.post(
            "/api/biography/",
            json={"user_id": user_id, "title": "我的传记", "style": "story"},
            headers=headers,
        )
        assert bio_resp.status_code == 200
        data = bio_resp.json()
        assert data["title"] == "我的传记"

        questions_resp = await client.get(f"/api/biography/{data['id']}/questions", headers=headers)
        assert questions_resp.status_code == 200
        assert len(questions_resp.json()["questions"]) > 0


@pytest.mark.asyncio
async def test_upload_recording_and_process():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        user_id, headers = await create_authenticated_user(client, "录音用户", "rec")

        bio_resp = await client.post(
            "/api/biography/",
            json={"user_id": user_id, "title": "测试传记", "style": "story"},
            headers=headers,
        )
        biography_id = bio_resp.json()["id"]

        wav_header = b"RIFF" + b"\x00" * 4 + b"WAVE" + b"fmt " + b"\x00" * 20
        files = {"file": ("test.wav", wav_header, "audio/wav")}
        data = {
            "user_id": user_id,
            "biography_id": biography_id,
            "recording_id": f"rec_test_{uuid.uuid4().hex[:8]}",
        }
        upload_resp = await client.post(
            "/api/recordings/upload", files=files, data=data, headers=headers
        )
        assert upload_resp.status_code == 200
        recording_id = upload_resp.json()["id"]

        transcribe_resp = await client.post(
            f"/api/recordings/{recording_id}/transcribe", headers=headers
        )
        assert transcribe_resp.status_code == 200
        assert transcribe_resp.json()["status"] == "transcribed"

        process_resp = await client.post(
            f"/api/biography/{biography_id}/process",
            json={"recording_id": recording_id},
            headers=headers,
        )
        assert process_resp.status_code == 200
        assert process_resp.json()["content"]

        book_resp = await client.post(f"/api/books/generate/{biography_id}", headers=headers)
        assert book_resp.status_code == 200
        assert book_resp.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_login_and_protected_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        email = f"auth-{uuid.uuid4()}@example.com"
        password = "secret123"
        await client.post(
            "/api/users/",
            json={"name": "Auth User", "email": email, "password": password},
        )

        login_resp = await client.post(
            "/api/users/login",
            json={"email": email, "password": password},
        )
        assert login_resp.status_code == 200
        assert login_resp.json()["access_token"]

        bad_login = await client.post(
            "/api/users/login",
            json={"email": email, "password": "wrong"},
        )
        assert bad_login.status_code == 401

        unauth_resp = await client.get("/api/biography/user/fake-id")
        assert unauth_resp.status_code == 401
