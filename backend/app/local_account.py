"""Register a local development account without seeding any workspaces."""

from uuid import uuid4

from sqlalchemy import select

from app.auth import local_auth_enabled
from app.database import get_session
from app.models import User


def main() -> None:
    if not local_auth_enabled():
        raise SystemExit("Set APP_ENV=development and ENABLE_LOCAL_AUTH=true.")
    for session in get_session():
        user = session.scalar(select(User).where(User.subject == "ripple-local-developer"))
        if user is None:
            user = User(
                id=uuid4(), subject="ripple-local-developer", display_name="Local developer"
            )
            session.add(user)
            session.commit()
        print(user.id)


if __name__ == "__main__":
    main()
