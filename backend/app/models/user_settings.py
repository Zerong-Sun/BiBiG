from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    stt_provider = Column(String, default="mock")
    stt_api_key_encrypted = Column(String, nullable=True)
    stt_base_url = Column(String, nullable=True)
    llm_provider = Column(String, nullable=True)
    llm_api_key_encrypted = Column(String, nullable=True)
    llm_base_url = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    default_style = Column(String, default="story")
    default_question_mode = Column(String, default="ai")
    theme = Column(String, default="ink")

    user = relationship("User", back_populates="settings")
