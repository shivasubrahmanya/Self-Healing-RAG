"""
In-memory metrics service for tracking RAG pipeline performance.

Thread-safe using asyncio locks. Metrics persist for the lifetime of the process.
For production, replace with a time-series database (Prometheus/InfluxDB).
"""
from __future__ import annotations
import asyncio
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class MetricsStore:
    """Thread-safe in-memory metrics store."""

    total_queries: int = 0
    total_uploads: int = 0
    total_chunks_indexed: int = 0
    healing_triggered_count: int = 0
    hallucinations_detected: int = 0

    # Running totals for averages
    total_confidence_sum: float = 0.0
    total_context_score_sum: float = 0.0
    total_response_time_ms_sum: float = 0.0

    # Confidence histogram buckets: "0.0-0.1", "0.1-0.2", ...
    confidence_buckets: dict[str, int] = field(
        default_factory=lambda: defaultdict(int)
    )

    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False, compare=False)

    @property
    def average_confidence(self) -> float:
        if self.total_queries == 0:
            return 0.0
        return self.total_confidence_sum / self.total_queries

    @property
    def average_context_score(self) -> float:
        if self.total_queries == 0:
            return 0.0
        return self.total_context_score_sum / self.total_queries

    @property
    def average_response_time_ms(self) -> float:
        if self.total_queries == 0:
            return 0.0
        return self.total_response_time_ms_sum / self.total_queries

    @property
    def retry_rate(self) -> float:
        if self.total_queries == 0:
            return 0.0
        return self.healing_triggered_count / self.total_queries

    @property
    def hallucination_rate(self) -> float:
        if self.total_queries == 0:
            return 0.0
        return self.hallucinations_detected / self.total_queries


class MetricsService:
    """Service facade for recording and reading metrics."""

    def __init__(self) -> None:
        self._store = MetricsStore()

    async def record_query(
        self,
        confidence: float,
        context_score: float,
        response_time_ms: float,
        healing_triggered: bool,
        hallucination_detected: bool,
    ) -> None:
        """Record metrics for a completed chat request."""
        async with self._store._lock:
            self._store.total_queries += 1
            self._store.total_confidence_sum += confidence
            self._store.total_context_score_sum += context_score
            self._store.total_response_time_ms_sum += response_time_ms

            if healing_triggered:
                self._store.healing_triggered_count += 1
            if hallucination_detected:
                self._store.hallucinations_detected += 1

            # Bucket confidence to 0.1 intervals
            bucket_lower = int(confidence * 10) / 10
            bucket_key = f"{bucket_lower:.1f}-{min(bucket_lower + 0.1, 1.0):.1f}"
            self._store.confidence_buckets[bucket_key] += 1

    async def record_upload(self, chunks_indexed: int) -> None:
        """Record metrics for a document upload."""
        async with self._store._lock:
            self._store.total_uploads += 1
            self._store.total_chunks_indexed += chunks_indexed

    async def get_metrics(self) -> dict:
        """Return a snapshot of all metrics."""
        async with self._store._lock:
            return {
                "total_queries": self._store.total_queries,
                "total_uploads": self._store.total_uploads,
                "total_chunks_indexed": self._store.total_chunks_indexed,
                "healing_triggered_count": self._store.healing_triggered_count,
                "hallucinations_detected": self._store.hallucinations_detected,
                "average_confidence": round(self._store.average_confidence, 4),
                "average_context_score": round(self._store.average_context_score, 4),
                "average_response_time_ms": round(self._store.average_response_time_ms, 2),
                "retry_rate": round(self._store.retry_rate, 4),
                "hallucination_rate": round(self._store.hallucination_rate, 4),
                "confidence_histogram": dict(self._store.confidence_buckets),
            }


# Module-level singleton
_metrics_service: Optional[MetricsService] = None


def get_metrics_service() -> MetricsService:
    """Return the singleton MetricsService."""
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service
