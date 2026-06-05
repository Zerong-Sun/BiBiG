import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.models.base import init_db, SessionLocal, engine, Base


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    init_db()
    yield


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_create_user_and_biography():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        user_resp = await client.post(
            "/api/users/",
            json={"name": "测试用户", "email": f"test-{uuid.uuid4()}@example.com"},
        )
        assert user_resp.status_code == 200
        user_id = user_resp.json()["id"]

        bio_resp = await client.post(
            "/api/biography/",
            json={"user_id": user_id, "title": "我的传记", "style": "story"},
        )
        assert bio_resp.status_code == 200
        data = bio_resp.json()
        assert data["title"] == "我的传记"

        questions_resp = await client.get(f"/api/biography/{data['id']}/questions")
        assert questions_resp.status_code == 200
        assert len(questions_resp.json()["questions"]) > 0


@pytest.mark.asyncio
async def test_upload_recording_and_process():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        user_resp = await client.post(
            "/api/users/",
            json={"name": "录音用户", "email": f"rec-{uuid.uuid4()}@example.com"},
        )
        user_id = user_resp.json()["id"]

        bio_resp = await client.post(
            "/api/biography/",
            json={"user_id": user_id, "title": "测试传记", "style": "story"},
        )
        biography_id = bio_resp.json()["id"]

        wav_header = b"RIFF" + b"\x00" * 4 + b"WAVE" + b"fmt " + b"\x00" * 20
        files = {"file": ("test.wav", wav_header, "audio/wav")}
        data = {
            "user_id": user_id,
            "biography_id": biography_id,
            "recording_id": f"rec_test_{uuid.uuid4().hex[:8]}",
        }
        upload_resp = await client.post("/api/recordings/upload", files=files, data=data)
        assert upload_resp.status_code == 200
        recording_id = upload_resp.json()["id"]
        assert upload_resp.json()["status"] == "transcribed"

        process_resp = await client.post(
            f"/api/biography/{biography_id}/process",
            json={"recording_id": recording_id},
        )
        assert process_resp.status_code == 200
        assert process_resp.json()["content"]

        book_resp = await client.post(f"/api/books/generate/{biography_id}")
        assert book_resp.status_code == 200
        assert book_resp.json()["status"] == "ready"
