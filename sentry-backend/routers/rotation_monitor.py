from fastapi import APIRouter
import json
from pathlib import Path

router = APIRouter(
    prefix="/rotation-monitor",
    tags=["Rotation Monitor"],
)

STATE_FILE = Path("/home/kenyatta/sentry/runtime/live_rotator_state.json")
SIGNALS_FILE = Path("/home/kenyatta/sentry/runtime/pending_signals.json")

@router.get("/")
def get_rotation_monitor():
    data = {
        "current": "-",
        "current_score": 0.0,
        "candidate": "-",
        "candidate_score": 0.0,
        "score_difference": 0.0,
        "decision": "HOLD",
        "current_rank": 0,
        "candidate_rank": 0,
        "expected_improvement": 0.0
    }

    if not STATE_FILE.exists():
        return data

    try:
        with STATE_FILE.open("r") as f:
            state = json.load(f)
        
        rot = state.get("rotation", {})
        current = rot.get("current", "-")
        current_score = rot.get("current_score", 0.0)
        candidate = rot.get("candidate", "-")
        candidate_score = rot.get("candidate_score", 0.0)
        decision = rot.get("decision", "HOLD")

        # Load signals to find ranks
        signals = []
        if SIGNALS_FILE.exists():
            try:
                with SIGNALS_FILE.open("r") as f:
                    signals = json.load(f)
            except Exception:
                signals = []

        current_rank = 0
        candidate_rank = 0

        for sig in signals:
            if sig.get("symbol") == current:
                current_rank = sig.get("rank", 0)
            if sig.get("symbol") == candidate:
                candidate_rank = sig.get("rank", 0)

        score_difference = round(abs(candidate_score or 0.0) - abs(current_score or 0.0), 4)
        if current_score and current_score != 0:
            expected_improvement = round((score_difference / abs(current_score)) * 100.0, 2)
        else:
            expected_improvement = 0.0

        return {
            "current": current or "-",
            "current_score": current_score or 0.0,
            "candidate": candidate or "-",
            "candidate_score": candidate_score or 0.0,
            "score_difference": score_difference,
            "decision": decision,
            "current_rank": current_rank,
            "candidate_rank": candidate_rank,
            "expected_improvement": expected_improvement
        }
    except Exception as e:
        print(f"Error in rotation monitor router: {e}")
        return data
