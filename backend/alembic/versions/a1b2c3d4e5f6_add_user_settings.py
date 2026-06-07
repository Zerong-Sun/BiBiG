"""add user_settings and recording_method

Revision ID: a1b2c3d4e5f6
Revises: 612bc89ae6c0
Create Date: 2026-06-06

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '612bc89ae6c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_settings',
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('stt_provider', sa.String(), nullable=True),
        sa.Column('stt_api_key_encrypted', sa.String(), nullable=True),
        sa.Column('stt_base_url', sa.String(), nullable=True),
        sa.Column('llm_provider', sa.String(), nullable=True),
        sa.Column('llm_api_key_encrypted', sa.String(), nullable=True),
        sa.Column('llm_base_url', sa.String(), nullable=True),
        sa.Column('llm_model', sa.String(), nullable=True),
        sa.Column('default_style', sa.String(), nullable=True),
        sa.Column('default_question_mode', sa.String(), nullable=True),
        sa.Column('theme', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('user_id'),
    )
    with op.batch_alter_table('biographies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('recording_method', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('biographies', schema=None) as batch_op:
        batch_op.drop_column('recording_method')
    op.drop_table('user_settings')
