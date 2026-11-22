"""Run one lab's pytest suite in a subprocess and summarise it (used by the CLI and verify_all)."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

from labs.manipulators.catalog import ROOT, Lab

REPO_ROOT = ROOT.parents[1]


@dataclass
class Result:
    tests: int = 0
    failures: int = 0
    errors: int = 0
    skipped: int = 0
    seconds: float = 0.0
    returncode: int = 0
    output: str = ""
    messages: list = field(default_factory=list)   # (test name, first line of failure)
    skip_reasons: list = field(default_factory=list)

    @property
    def passed(self) -> int:
        return self.tests - self.failures - self.errors - self.skipped

    @property
    def ok(self) -> bool:
        return self.tests > 0 and self.failures == 0 and self.errors == 0 and self.returncode == 0

    def summary(self) -> str:
        s = f"{self.passed}/{self.tests - self.skipped} passed"
        if self.skipped:
            s += f", {self.skipped} skipped"
        return s


def run_lab_tests(lab: Lab, target: str = "starter", extra_args=(), quiet: bool = True) -> Result:
    env = dict(os.environ, LAB_TARGET=target, PYTHONDONTWRITEBYTECODE="1")
    env["PYTHONPATH"] = os.pathsep.join(filter(None, [str(REPO_ROOT), env.get("PYTHONPATH")]))
    with tempfile.TemporaryDirectory() as tmp:
        junit = Path(tmp) / "junit.xml"
        cmd = [sys.executable, "-m", "pytest", str(lab.path / "tests"), f"--junitxml={junit}",
               "--tb=short", "-q", *extra_args]
        t0 = time.perf_counter()
        proc = subprocess.run(cmd, cwd=REPO_ROOT, env=env, capture_output=quiet, text=True)
        res = Result(seconds=time.perf_counter() - t0, returncode=proc.returncode,
                     output=(proc.stdout or "") + (proc.stderr or ""))
        if not junit.exists():
            res.errors = 1
            res.messages.append(("<collection>", "pytest produced no report"))
            return res
        root = ET.parse(junit).getroot()
        suites = [root] if root.tag == "testsuite" else list(root)
        for suite in suites:
            for case in suite.iter("testcase"):
                res.tests += 1
                for tag in ("failure", "error", "skipped"):
                    node = case.find(tag)
                    if node is None:
                        continue
                    msg = (node.get("message") or "").strip().splitlines()
                    first = msg[0] if msg else tag
                    if tag == "failure":
                        res.failures += 1
                        res.messages.append((case.get("name"), first))
                    elif tag == "error":
                        res.errors += 1
                        res.messages.append((case.get("name"), first))
                    else:
                        res.skipped += 1
                        res.skip_reasons.append((case.get("name"), first))
        if res.tests == 0 and proc.returncode not in (0, 5):
            res.errors = 1
            res.messages.append(("<collection>", "tests could not be collected; see output"))
    return res
