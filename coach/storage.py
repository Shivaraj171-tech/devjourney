"""Small file helpers: atomic JSON writes, locked JSONL appends, error log."""

from __future__ import annotations

import json
import os
import tempfile
import time
import traceback
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

try:  # POSIX only; on Windows appends are best-effort without a lock.
    import fcntl  # type: ignore
except ImportError:  # pragma: no cover - Windows
    fcntl = None  # type: ignore


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def atomic_write_json(path: Path, data) -> None:
    atomic_write_text(path, json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def read_json(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


@contextmanager
def locked(fh) -> Iterator[None]:
    if fcntl is not None:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
    try:
        yield
    finally:
        if fcntl is not None:
            fcntl.flock(fh.fileno(), fcntl.LOCK_UN)


def append_jsonl(path: Path, record: dict) -> None:
    """Append one JSON line, holding an exclusive lock on POSIX.

    If the file was renamed away (claimed by the processor) between open and
    lock, reopen so the line lands in the live file.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False) + "\n"
    for _ in range(3):
        with open(path, "a", encoding="utf-8") as fh:
            with locked(fh):
                try:
                    same = os.fstat(fh.fileno()).st_ino == os.stat(path).st_ino
                except OSError:
                    same = False
                if not same and fcntl is not None:
                    continue
                fh.write(line)
                fh.flush()
                return
    with open(path, "a", encoding="utf-8") as fh:  # last resort
        fh.write(line)


def read_jsonl(path: Path) -> list[dict]:
    out: list[dict] = []
    try:
        with open(path, encoding="utf-8") as fh:
            for raw in fh:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    item = json.loads(raw)
                except ValueError:
                    continue
                if isinstance(item, dict):
                    out.append(item)
    except OSError:
        pass
    return out


def claim_file(path: Path, dest: Path) -> bool:
    """Atomically move ``path`` to ``dest`` under the append lock."""
    try:
        fh = open(path, "a", encoding="utf-8")
    except OSError:
        return False
    try:
        with locked(fh):
            try:
                os.replace(path, dest)
            except OSError:
                return False
    finally:
        fh.close()
    return True


def log_error(errors_path: Path, where: str, exc: BaseException | None = None) -> None:
    """Never raises. Keeps the log under ~1 MB."""
    try:
        errors_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            if errors_path.stat().st_size > 1_000_000:
                os.replace(errors_path, errors_path.with_suffix(".log.1"))
        except OSError:
            pass
        with open(errors_path, "a", encoding="utf-8") as fh:
            fh.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {where}\n")
            if exc is not None:
                fh.write("".join(traceback.format_exception(type(exc), exc, exc.__traceback__)))
    except Exception:
        pass


def write_status(status_path: Path, message: str, level: str = "info") -> None:
    try:
        atomic_write_json(status_path, {"message": message, "level": level, "ts": time.time()})
    except Exception:
        pass
