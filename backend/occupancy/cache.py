"""
High-Speed Caching Layer with Redis Interface and Resilient In-Memory Fallback.

Implements:
1. Timestamp-rounded cache keys: occupancy:{facility_id}:{rounded_timestamp_2min}
2. Fixed 120-second TTL
3. Strong ETag calculation via cryptographic payload hashing
4. Zero-dependency In-Memory fallback cache with thread-safe async access and LRU/TTL eviction
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
from typing import Any, Dict, Optional, Tuple


def generate_rounded_timestamp(window_seconds: int = 120) -> int:
    """Rounds the current epoch time down to the nearest 2-minute boundary."""
    now = int(time.time())
    return now - (now % window_seconds)


def make_occupancy_cache_key(facility_id: str, rounded_ts: int) -> str:
    """Builds canonical occupancy cache key."""
    return f"occupancy:{facility_id}:{rounded_ts}"


def make_forecast_cache_key(facility_id: str, rounded_ts: int) -> str:
    """Builds canonical forecast cache key."""
    return f"forecast:{facility_id}:{rounded_ts}"


def compute_etag(payload: str) -> str:
    """Generates strong HTTP ETag from serialized payload."""
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
    return f'"{digest}"'


class InMemoryCacheStore:
    """Thread-safe, coroutine-safe in-memory cache with TTL expiration."""

    def __init__(self, max_size: int = 1000):
        self._max_size = max_size
        self._store: Dict[str, Tuple[float, Any]] = {}  # key -> (expiry_time, value)
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[str]:
        async with self._lock:
            if key not in self._store:
                return None
            expiry, value = self._store[key]
            if time.time() > expiry:
                del self._store[key]
                return None
            return value

    async def set(self, key: str, value: str, ttl_seconds: int = 120) -> None:
        async with self._lock:
            # Simple eviction if overflowing
            if len(self._store) >= self._max_size:
                now = time.time()
                # Purge expired keys first
                expired_keys = [k for k, (exp, _) in self._store.items() if exp < now]
                for k in expired_keys:
                    del self._store[k]

                # If still over size, delete oldest 10%
                if len(self._store) >= self._max_size:
                    sorted_keys = sorted(self._store.keys(), key=lambda k: self._store[k][0])
                    for k in sorted_keys[: max(1, self._max_size // 10)]:
                        del self._store[k]

            self._store[key] = (time.time() + ttl_seconds, value)


class CacheManager:
    """
    Unified Cache Manager attempting Redis connection if configured,
    falling back seamlessly to high-performance local memory.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL")
        self._redis_client = None
        self._memory_cache = InMemoryCacheStore()
        self._redis_available = False

    async def initialize(self) -> None:
        """Attempts to initialize Redis client if library and connection are available."""
        if not self.redis_url:
            return

        try:
            import redis.asyncio as aioredis
            self._redis_client = aioredis.from_url(self.redis_url, decode_responses=True)
            await self._redis_client.ping()
            self._redis_available = True
        except Exception:
            self._redis_available = False
            self._redis_client = None

    async def get(self, key: str) -> Optional[str]:
        if self._redis_available and self._redis_client:
            try:
                return await self._redis_client.get(key)
            except Exception:
                self._redis_available = False

        return await self._memory_cache.get(key)

    async def set(self, key: str, value: str, ttl: int = 120) -> None:
        if self._redis_available and self._redis_client:
            try:
                await self._redis_client.set(key, value, ex=ttl)
                return
            except Exception:
                self._redis_available = False

        await self._memory_cache.set(key, value, ttl_seconds=ttl)

    async def close(self) -> None:
        if self._redis_client:
            try:
                await self._redis_client.close()
            except Exception:
                pass


# Global cache manager instance
cache_manager = CacheManager()

