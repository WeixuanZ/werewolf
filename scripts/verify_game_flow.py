import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:8000/api"


def request(method, url, data=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if data is not None:
        json_data = json.dumps(data).encode("utf-8")
        req.data = json_data

    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        raise
    except Exception as e:
        print(f"Error: {e}")
        raise


def create_room():
    print("Creating room...")
    data = request("POST", f"{BASE_URL}/rooms", {})
    print(f"Room created: {data['room_id']}")
    return data["room_id"]


def join_game(room_id, nickname):
    print(f"Joining {nickname}...")
    data = request("POST", f"{BASE_URL}/rooms/{room_id}/join", {"nickname": nickname})
    for pid, p in data["players"].items():
        if p["nickname"] == nickname:
            return pid
    return None


def start_game(room_id, admin_id):
    print("Starting game...")
    data = request("POST", f"{BASE_URL}/rooms/{room_id}/start", {"player_id": admin_id})
    print("Game started!")
    return data


def submit_action(room_id, player_id, action, target_id):
    print(f"Submitting action {action} for {player_id} on {target_id}...")
    return request(
        "POST",
        f"{BASE_URL}/rooms/{room_id}/action?player_id={player_id}",
        {"action_type": action, "target_id": target_id},
    )


def main():
    try:
        room_id = create_room()

        # 1. Join players
        admin_id = join_game(room_id, "AdminWolf")
        _ = join_game(room_id, "Seer")
        _ = join_game(room_id, "Doc")
        _ = join_game(room_id, "Villager")

        # 2. Start Game
        game_state = start_game(room_id, admin_id)
        print(f"Phase: {game_state['phase']}")

        players = game_state["players"]

        # Helper to find ID by role
        def get_id_by_role(role):
            for pid, p in players.items():
                if p["role"] == role:
                    return pid
            return None

        wolf_id = get_id_by_role("WEREWOLF")
        seer_real_id = get_id_by_role("SEER")
        doc_real_id = get_id_by_role("DOCTOR")
        villager_real_id = get_id_by_role("VILLAGER")

        # 3. Night Actions
        # Wolf kills Villager
        submit_action(room_id, wolf_id, "KILL", villager_real_id)

        # Doc saves Seer (so Villager should die)
        submit_action(room_id, doc_real_id, "SAVE", seer_real_id)

        # Seer checks Wolf
        game_state = submit_action(room_id, seer_real_id, "CHECK", wolf_id)

        # 4. Verify Day Transition
        print(f"New Phase: {game_state['phase']}")

        if game_state["phase"] != "DAY":
            print("ERROR: Did not transition to DAY")
            sys.exit(1)
        else:
            print("SUCCESS: Transition to DAY")

        # 5. Verify Deaths and Online Status
        updated_players = game_state["players"]
        villager = updated_players[villager_real_id]
        if not villager["is_alive"]:
            print("SUCCESS: Villager is dead")
        else:
            print("ERROR: Villager should be dead")
            sys.exit(1)

        # Verify is_online (should be false for all since this script is REST-only)
        for pid, p in updated_players.items():
            if p.get("is_online") is True:
                print(f"ERROR: Player {p['nickname']} should be offline")
                sys.exit(1)
        print("SUCCESS: Online status correctly reflected (all offline)")

    except Exception as e:
        print(f"Test Failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
