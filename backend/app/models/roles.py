from abc import ABC, abstractmethod

from app.schemas.game import RoleType

# Re-export for convenience
__all__ = ["Role", "RoleType", "get_role_instance"]


class Role(ABC):
    def __init__(self, role_type: RoleType):
        self.role_type = role_type

    @property
    def can_vote(self) -> bool:
        return True  # Most roles can vote during the day

    @property
    def can_act_at_night(self) -> bool:
        return False

    @abstractmethod
    def get_description(self) -> str:
        pass


class Villager(Role):
    def __init__(self):
        super().__init__(RoleType.VILLAGER)

    def get_description(self) -> str:
        return "Find the werewolves and vote them out during the day."


class Werewolf(Role):
    def __init__(self):
        super().__init__(RoleType.WEREWOLF)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "Kill a villager each night. Don't get caught."


class Seer(Role):
    def __init__(self):
        super().__init__(RoleType.SEER)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "Inspect one player each night to reveal their true nature."


class Doctor(Role):
    def __init__(self):
        super().__init__(RoleType.DOCTOR)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "Protect one player from being killed each night."


def get_role_instance(role_type: RoleType) -> Role:
    if role_type == RoleType.WEREWOLF:
        return Werewolf()
    elif role_type == RoleType.SEER:
        return Seer()
    elif role_type == RoleType.DOCTOR:
        return Doctor()
    return Villager()
