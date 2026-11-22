"""Shared pytest plumbing for the manipulator labs.

Every lab test asks for the ``impl`` fixture. It imports either your
``starter.py`` (the default) or the reference ``solution.py``:

    LAB_TARGET=starter   pytest labs/manipulators/lab01_rotations   # your code
    LAB_TARGET=solution  pytest labs/manipulators/lab01_rotations   # reference

If a function is still a TODO (raises ``NotImplementedError``), the test fails
with a short message that names the function instead of a long traceback.
"""

from __future__ import annotations

import functools
import importlib
import os
import pathlib
import sys

import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

TARGETS = ("starter", "solution")


def lab_target() -> str:
    target = os.environ.get("LAB_TARGET", "starter")
    if target not in TARGETS:
        raise pytest.UsageError(f"LAB_TARGET must be one of {TARGETS}, got {target!r}")
    return target


class _TodoGuard:
    """Wraps a lab module so a TODO becomes a clean, named test failure."""

    def __init__(self, module, lab: str):
        self._module = module
        self._lab = lab

    def __getattr__(self, name):
        if not hasattr(self._module, name):
            pytest.fail(f"{self._lab}: `{name}` is missing from {self._module.__name__}. "
                        f"Did you rename or delete it?", pytrace=False)
        obj = getattr(self._module, name)
        if not callable(obj) or isinstance(obj, type):
            return obj

        @functools.wraps(obj)
        def wrapper(*args, **kwargs):
            try:
                return obj(*args, **kwargs)
            except NotImplementedError as exc:
                pytest.fail(f"TODO: `{name}` in {self._lab}/starter.py is not implemented yet "
                            f"({exc})", pytrace=False)

        return wrapper


@pytest.fixture(scope="module")
def impl(request):
    # test modules live at labs.manipulators.<lab>.tests.test_<lab>
    parts = request.module.__name__.split(".")
    lab = parts[parts.index("tests") - 1]
    module = importlib.import_module(f"labs.manipulators.{lab}.{lab_target()}")
    return _TodoGuard(module, lab)


@pytest.fixture
def rng():
    return __import__("numpy").random.default_rng(12345)
