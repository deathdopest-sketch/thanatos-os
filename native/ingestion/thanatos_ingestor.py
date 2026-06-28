#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import platform
import sqlite3
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class IngestConfig:
    database_path: Path
    poll_interval_seconds: int
    max_file_bytes: int
    allowed_roots: tuple[Path, ...]
    ignored_names: tuple[str, ...]
    ignored_suffixes: tuple[str, ...]
    text_suffixes: tuple[str, ...]
    network_metadata: bool
    raw_packet_capture: bool


def expand_path(value: str) -> Path:
    return Path(os.path.expandvars(os.path.expanduser(value))).resolve()


def load_config(path: Path) -> IngestConfig:
    with path.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)

    return IngestConfig(
        database_path=expand_path(raw["database_path"]),
        poll_interval_seconds=int(raw.get("poll_interval_seconds", 20)),
        max_file_bytes=int(raw.get("max_file_bytes", 1048576)),
        allowed_roots=tuple(expand_path(item) for item in raw.get("allowed_roots", [])),
        ignored_names=tuple(raw.get("ignored_names", [])),
        ignored_suffixes=tuple(raw.get("ignored_suffixes", [])),
        text_suffixes=tuple(raw.get("text_suffixes", [])),
        network_metadata=bool(raw.get("network_metadata", True)),
        raw_packet_capture=bool(raw.get("raw_packet_capture", False)),
    )


def init_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS file_profiles (
          path TEXT PRIMARY KEY,
          root TEXT NOT NULL,
          suffix TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          modified_at REAL NOT NULL,
          sha256 TEXT NOT NULL,
          preview TEXT NOT NULL,
          indexed_at REAL NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS system_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hostname TEXT NOT NULL,
          platform TEXT NOT NULL,
          load_avg TEXT NOT NULL,
          memory TEXT NOT NULL,
          network TEXT NOT NULL,
          captured_at REAL NOT NULL
        )
        """
    )
    connection.commit()
    return connection


def should_ignore(path: Path, config: IngestConfig) -> bool:
    if any(part in config.ignored_names for part in path.parts):
        return True
    lower_name = path.name.lower()
    return any(lower_name.endswith(suffix.lower()) for suffix in config.ignored_suffixes)


def iter_files(config: IngestConfig) -> Iterable[tuple[Path, Path]]:
    for root in config.allowed_roots:
        if not root.exists() or not root.is_dir():
            continue
        for current_root, directories, files in os.walk(root):
            current = Path(current_root)
            directories[:] = [name for name in directories if name not in config.ignored_names]
            for filename in files:
                path = current / filename
                if should_ignore(path, config):
                    continue
                if path.suffix.lower() not in config.text_suffixes:
                    continue
                yield root, path


def safe_read_text(path: Path, max_bytes: int) -> str:
    with path.open("rb") as handle:
        payload = handle.read(max_bytes + 1)
    if len(payload) > max_bytes:
        payload = payload[:max_bytes]
    return payload.decode("utf-8", errors="replace")


def profile_file(connection: sqlite3.Connection, root: Path, path: Path, config: IngestConfig) -> None:
    stat = path.stat()
    if stat.st_size > config.max_file_bytes:
        return

    text = safe_read_text(path, config.max_file_bytes)
    digest = hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()
    preview = text[:4000]
    connection.execute(
        """
        INSERT INTO file_profiles(path, root, suffix, size_bytes, modified_at, sha256, preview, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          root = excluded.root,
          suffix = excluded.suffix,
          size_bytes = excluded.size_bytes,
          modified_at = excluded.modified_at,
          sha256 = excluded.sha256,
          preview = excluded.preview,
          indexed_at = excluded.indexed_at
        """,
        (
            str(path),
            str(root),
            path.suffix.lower(),
            stat.st_size,
            stat.st_mtime,
            digest,
            preview,
            time.time(),
        ),
    )


def run_command(command: list[str]) -> str:
    try:
        result = subprocess.run(command, check=False, capture_output=True, text=True, timeout=3)
    except (OSError, subprocess.TimeoutExpired) as error:
        return f"unavailable: {error}"
    output = result.stdout.strip() or result.stderr.strip()
    return output[:8000]


def capture_system_snapshot(connection: sqlite3.Connection, include_network: bool) -> None:
    load_avg = ", ".join(str(item) for item in os.getloadavg()) if hasattr(os, "getloadavg") else "unavailable"
    memory = run_command(["sh", "-lc", "free -h 2>/dev/null || vm_stat 2>/dev/null || echo unavailable"])
    network = run_command(["sh", "-lc", "ip -brief address 2>/dev/null || ifconfig 2>/dev/null || echo unavailable"]) if include_network else "disabled"
    connection.execute(
        """
        INSERT INTO system_snapshots(hostname, platform, load_avg, memory, network, captured_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (platform.node(), platform.platform(), load_avg, memory, network, time.time()),
    )


def ingest_once(config: IngestConfig) -> int:
    if config.raw_packet_capture:
        raise SystemExit("raw_packet_capture is intentionally unsupported in this ingestor. Use a separate explicit PCAP tool.")

    connection = init_db(config.database_path)
    indexed = 0
    try:
        for root, path in iter_files(config):
            try:
                profile_file(connection, root, path, config)
                indexed += 1
            except (OSError, UnicodeError):
                continue
        capture_system_snapshot(connection, config.network_metadata)
        connection.commit()
    finally:
        connection.close()
    return indexed


def main() -> int:
    parser = argparse.ArgumentParser(description="Thanatos OS local allowlisted ingestor")
    parser.add_argument("--config", required=True, help="Path to ingestion JSON config")
    parser.add_argument("--once", action="store_true", help="Run one ingestion pass and exit")
    args = parser.parse_args()

    config = load_config(expand_path(args.config))

    if args.once:
        indexed = ingest_once(config)
        print(f"indexed_files={indexed}")
        return 0

    while True:
        indexed = ingest_once(config)
        print(f"indexed_files={indexed}")
        time.sleep(config.poll_interval_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
