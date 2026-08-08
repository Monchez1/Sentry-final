"""
Security utilities for SENTRY — PIN hashing and verification.
Uses Python's built-in hashlib (PBKDF2) to be 100% dependency-free on Render/prod.
"""
import hashlib
import secrets
from fastapi import HTTPException


def hash_pin(pin: str) -> str:
    """Hash a 4-digit PIN using PBKDF2-HMAC-SHA256. Returns a string with salt and hash."""
    if not pin or len(pin) != 4 or not pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits.")
    
    salt = secrets.token_hex(16)
    db_hash = hashlib.pbkdf2_hmac('sha256', pin.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"{salt}:{db_hash}"


def verify_pin(plain_pin: str, hashed: str) -> bool:
    """Return True if plain_pin matches the stored hashed value."""
    if not plain_pin or not hashed or ":" not in hashed:
        return False
    try:
        salt, stored_hash = hashed.split(":", 1)
        db_hash = hashlib.pbkdf2_hmac('sha256', plain_pin.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
        return secrets.compare_digest(db_hash, stored_hash)
    except Exception:
        return False


def require_pin(plain_pin: str | None, hashed: str | None) -> None:
    """
    Raise HTTP 403 if the supplied PIN does not match the stored hash.
    Call this inside any route that must be PIN-protected.
    """
    if not hashed:
        raise HTTPException(
            status_code=403,
            detail="A Security PIN has not been set. Please set one in Settings before performing this action."
        )
    if not plain_pin:
        raise HTTPException(
            status_code=403,
            detail="Security PIN required for this operation."
        )
    if not verify_pin(plain_pin, hashed):
        raise HTTPException(status_code=403, detail="Incorrect Security PIN.")
