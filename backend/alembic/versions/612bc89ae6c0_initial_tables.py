"""initial tables

Revision ID: 612bc89ae6c0
Revises:
Create Date: 2026-06-05 22:52:25.309142

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '612bc89ae6c0'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('avatar_url', sa.String(), nullable=True),
        sa.Column('birth_date', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('phone'),
    )

    op.create_table(
        'biographies',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column(
            'style',
            sa.Enum('lyrical', 'rigorous', 'story', 'chronological', name='biographystyle', native_enum=False),
            nullable=True,
        ),
        sa.Column(
            'status',
            sa.Enum('draft', 'in_progress', 'review', 'completed', name='biographystatus', native_enum=False),
            nullable=True,
        ),
        sa.Column('birth_year', sa.Integer(), nullable=True),
        sa.Column('hometown', sa.String(), nullable=True),
        sa.Column('key_events', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'recordings',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('biography_id', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('audio_url', sa.String(), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('transcript_segments', sa.Text(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('uploading', 'processing', 'transcribed', 'failed', name='recordingstatus', native_enum=False),
            nullable=True,
        ),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['biography_id'], ['biographies.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'biography_entries',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('biography_id', sa.String(), nullable=False),
        sa.Column('recording_id', sa.String(), nullable=True),
        sa.Column('chapter_number', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('original_transcript', sa.Text(), nullable=True),
        sa.Column('time_period_start', sa.String(), nullable=True),
        sa.Column('time_period_end', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['biography_id'], ['biographies.id']),
        sa.ForeignKeyConstraint(['recording_id'], ['recordings.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'chapters',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('biography_id', sa.String(), nullable=False),
        sa.Column('number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['biography_id'], ['biographies.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'books',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('biography_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('author_name', sa.String(), nullable=True),
        sa.Column('cover_image_url', sa.String(), nullable=True),
        sa.Column(
            'format',
            sa.Enum('pdf', 'epub', 'docx', name='bookformat', native_enum=False),
            nullable=True,
        ),
        sa.Column('file_url', sa.String(), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('generating', 'ready', 'failed', name='bookstatus', native_enum=False),
            nullable=True,
        ),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['biography_id'], ['biographies.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('books')
    op.drop_table('chapters')
    op.drop_table('biography_entries')
    op.drop_table('recordings')
    op.drop_table('biographies')
    op.drop_table('users')
