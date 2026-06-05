import io
import os
import uuid
from pathlib import Path
from app.core.config import settings


class StorageService:
    def __init__(self):
        self.bucket = settings.MINIO_BUCKET
        self.use_local = settings.USE_LOCAL_STORAGE
        self.local_path = Path(settings.LOCAL_STORAGE_PATH)
        self.client = None

        if self.use_local:
            self.local_path.mkdir(parents=True, exist_ok=True)
        else:
            from minio import Minio

            self.client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=False,
            )
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)

    async def upload_audio(self, file_data: bytes, filename: str) -> str:
        object_name = f"audio/{uuid.uuid4()}/{filename}"

        if self.use_local:
            target = self.local_path / object_name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(file_data)
            return str(target.resolve())

        self.client.put_object(
            self.bucket,
            object_name,
            io.BytesIO(file_data),
            len(file_data),
            content_type="audio/wav",
        )
        return f"http://{settings.MINIO_ENDPOINT}/{self.bucket}/{object_name}"

    async def upload_file(self, file_data: bytes, object_name: str, content_type: str) -> str:
        if self.use_local:
            target = self.local_path / object_name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(file_data)
            return str(target.resolve())

        self.client.put_object(
            self.bucket,
            object_name,
            io.BytesIO(file_data),
            len(file_data),
            content_type=content_type,
        )
        return f"http://{settings.MINIO_ENDPOINT}/{self.bucket}/{object_name}"

    async def get_audio_url(self, object_name: str) -> str:
        if self.use_local:
            return str((self.local_path / object_name).resolve())
        return self.client.presigned_get_object(self.bucket, object_name)
