"""remove email_verified column

Revision ID: remove_email_verified
Revises: 0f97f6d42c4b
Create Date: 2025-11-23 05:42:14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_email_verified'
down_revision = '0f97f6d42c4b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the email_verified column from users table
    op.drop_column('users', 'email_verified')


def downgrade() -> None:
    # Add the email_verified column back if we need to rollback
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
