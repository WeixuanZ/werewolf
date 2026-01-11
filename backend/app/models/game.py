import random

from app.models.player import Player
from app.models.roles import RoleType
from app.schemas.game import (
    GamePhase,
    GameSettingsSchema,
    GameStateSchema,
    PlayerSchema,
)


class Game:
    def __init__(self, room_id: str, settings: GameSettingsSchema):
        self.room_id = room_id
        self.settings = settings
        self.phase = GamePhase.WAITING
        self.players: dict[str, Player] = {}
        self.turn_count = 0
        self.winners = None
        self.night_actions: list[dict] = []
        self.seer_reveals: dict[str, list[str]] = {}  # {seer_id: [checked_player_ids]}

    @classmethod
    def from_schema(cls, schema: GameStateSchema) -> "Game":
        game = cls(schema.room_id, schema.settings)
        game.phase = schema.phase
        game.turn_count = schema.turn_count
        game.winners = schema.winners

        for pid, p_schema in schema.players.items():
            player = Player(
                id=p_schema.id,
                nickname=p_schema.nickname,
                is_admin=p_schema.is_admin,
                role_type=p_schema.role,
            )
            player.is_alive = p_schema.is_alive
            game.players[pid] = player

        game.night_actions = schema.night_actions.copy() if schema.night_actions else []
        game.seer_reveals = schema.seer_reveals.copy() if schema.seer_reveals else {}
        return game

    def add_player(self, player: Player):
        if self.phase != GamePhase.WAITING:
            raise ValueError("Cannot join game in progress")
        self.players[player.id] = player

    def remove_player(self, player_id: str):
        if player_id in self.players:
            del self.players[player_id]

    def start_game(self):
        if len(self.players) < 4:  # Minimum players rule, customizable
            # For testing, we might allow fewer, but standard mafia needs at least ~4-5
            pass

        self.phase = GamePhase.DAY  # Or Night, depending on preference. Usually Night 1.
        self.assign_roles()
        self.turn_count = 1

    def assign_roles(self):
        role_counts = self.settings.role_distribution
        # Create list of roles to distribute
        roles_to_assign = []
        for role, count in role_counts.items():
            roles_to_assign.extend([role] * count)

        player_ids = list(self.players.keys())

        # Fill rest with Villagers if not enough roles defined
        while len(roles_to_assign) < len(player_ids):
            roles_to_assign.append(RoleType.VILLAGER)

        # If too many roles, trim excess, preferring to remove Villagers first
        if len(roles_to_assign) > len(player_ids):
            # Remove Villagers first
            while len(roles_to_assign) > len(player_ids) and RoleType.VILLAGER in roles_to_assign:
                roles_to_assign.remove(RoleType.VILLAGER)

            # If still too many, just trim from end (assuming order matter or random outcome is acceptable fallback)
            # Better to prioritize Special roles?
            # For now, just slice to size if we still have excess
            roles_to_assign = roles_to_assign[: len(player_ids)]

        random.shuffle(roles_to_assign)

        for i, pid in enumerate(player_ids):
            self.players[pid].set_role(roles_to_assign[i])

    def to_schema(self) -> GameStateSchema:
        player_schemas = {
            pid: PlayerSchema(
                id=p.id,
                nickname=p.nickname,
                role=p.role.role_type if p.role else None,
                is_alive=p.is_alive,
                is_admin=p.is_admin,
            )
            for pid, p in self.players.items()
        }
        return GameStateSchema(
            room_id=self.room_id,
            phase=self.phase,
            players=player_schemas,
            settings=self.settings,
            turn_count=self.turn_count,
            winners=self.winners,
            night_actions=self.night_actions,
            seer_reveals=self.seer_reveals,
        )

    def process_night_action(self, action_type: str, target_id: str, actor_id: str):
        if self.phase != GamePhase.NIGHT:
            raise ValueError("Can only perform night actions during Night phase")

        actor = self.players.get(actor_id)
        if not actor or not actor.is_alive:
            return

        # Check if actor already acted this night (simple rule: one action per night)
        # We might allow overwriting action if they change their mind
        self.night_actions = [a for a in self.night_actions if a["actor_id"] != actor_id]

        self.night_actions.append(
            {"actor_id": actor_id, "action_type": action_type, "target_id": target_id}
        )

        # Track Seer reveals
        if action_type == "CHECK":
            if actor_id not in self.seer_reveals:
                self.seer_reveals[actor_id] = []
            if target_id not in self.seer_reveals[actor_id]:
                self.seer_reveals[actor_id].append(target_id)

    def resolve_night_phase(self):
        kills = set()
        protections = set()

        for action in self.night_actions:
            if action["action_type"] == "KILL":
                kills.add(action["target_id"])
            elif action["action_type"] == "SAVE":
                protections.add(action["target_id"])

        # Effective deaths: killed but not saved
        dead_ids = kills - protections

        for pid in dead_ids:
            if pid in self.players:
                self.players[pid].die()

        # Clear actions
        self.night_actions = []
        self.phase = GamePhase.DAY
        self.turn_count += 1
        return list(dead_ids)

        # Optional: Check winners after deaths
        # self.check_winners()
