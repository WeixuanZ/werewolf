from app.models.roles import Role, get_role_instance
from app.schemas.game import RoleType


class Player:
    def __init__(
        self, id: str, nickname: str, is_admin: bool = False, role_type: RoleType | None = None
    ):
        self.id = id
        self.nickname = nickname
        self.is_admin = is_admin
        self.is_alive = True
        self.role: Role | None = get_role_instance(role_type) if role_type else None

    def set_role(self, role_type: RoleType | None):
        self.role = get_role_instance(role_type) if role_type else None

    def die(self):
        self.is_alive = False

    def revive(self):
        # Specific rules check usually, but basic method here
        self.is_alive = True
