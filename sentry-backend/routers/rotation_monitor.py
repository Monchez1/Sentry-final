from fastapi import APIRouter
from services.rotator_state_reader import load_rotator_snapshot

router = APIRouter(
    prefix="/rotation-monitor",
    tags=["Rotation Monitor"],
)

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

    try:
        snap = load_rotator_snapshot()
        if not snap:
            return data
        
        rot = snap.get("rotation", {})
        current = rot.get("current", "-")
        current_score = rot.get("current_score", 0.0)
        candidate = rot.get("candidate", "-")
        candidate_score = rot.get("candidate_score", 0.0)
        decision = rot.get("decision", "HOLD")

        signals = snap.get("signals", []) or []

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
            "decision": decision or "HOLD",
            "current_rank": current_rank,
            "candidate_rank": candidate_rank,
            "expected_improvement": expected_improvement
        }
    except Exception as e:
        print(f"Error in rotation monitor router: {e}")
        return data
