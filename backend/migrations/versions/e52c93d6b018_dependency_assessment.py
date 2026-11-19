"""Store the latest dependency assessment and its decision."""

import sqlalchemy as sa
from alembic import op

revision = "e52c93d6b018"
down_revision = "c13a4f8d2b71"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("dependencies", sa.Column("assessment", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("dependencies", "assessment")
    op.drop_column("organizations", "description")
