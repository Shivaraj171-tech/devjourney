"""Optional: download Google DeepMind's MuJoCo Menagerie UR5e model (meshes + MJCF) to your laptop.

    python labs/manipulators/tools/fetch_menagerie_ur5e.py            # ~30 MB, once
    python labs/manipulators/tools/fetch_menagerie_ur5e.py --dest DIR

What it is: `universal_robots_ur5e/` from https://github.com/google-deepmind/mujoco_menagerie,
pinned to commit 370c4396 (2026-11-10). Licence: BSD-3-Clause, "Copyright 2018 ROS Industrial
Consortium" (the model's own LICENSE file, downloaded with it). Menagerie derived it from
ROS-Industrial's ur_e_description URDF and Universal Robots' meshes. We don't ship these files
in the repo: this script fetches them into a cache outside it, and every file is checked
against the SHA-256 we recorded from that commit.

Where it goes: $DEVJOURNEY_MENAGERIE_DIR if set, else ~/.cache/devjourney/mujoco_menagerie.
`labs/manipulators/toolbox/menagerie.py` finds it there; the demo
`tools/menagerie_ur5e_replay.py` and the tests in `tools/tests/` skip cleanly without it.

Standard library only (urllib + hashlib), no code from the download is run.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from labs.manipulators.toolbox.menagerie import (  # noqa: E402
    MENAGERIE_COMMIT, MODEL_DIR_NAME, menagerie_root,
)

BASE = (f"https://raw.githubusercontent.com/google-deepmind/mujoco_menagerie/{MENAGERIE_COMMIT}/"
        f"{MODEL_DIR_NAME}/")

# SHA-256 of every file at MENAGERIE_COMMIT (recorded 2026-11-23 from a clone of that commit).
FILES = {
    "LICENSE": "5ec71ccf66c8d03261448f2441a586765b97f2248c860a1ae19689fb1c45cee6",
    "README.md": "435600d4f00cfdbd7edec4b60f0cd7fbb539f39abaefcd8bb3994beed3b1156a",
    "CHANGELOG.md": "fdd7bcb68ef1462eea538b540926316da254524246a7e24d862315efeca314e7",
    "ur5e.xml": "2311486b7d013caa5db76d0abe46b5b235642c7baf3b91fbb7dbd93048774fa5",
    "scene.xml": "139e7214aa90da401fa8fb4c78f46e1c57f9b1ad849780d5a379da9d047fc339",
    "assets/base_0.obj": "9a3b21f1524baef6af8a52d7af90b6e94b79f7e3c2b04a0f6581f74d22291b0b",
    "assets/base_1.obj": "cf7d54691a2c1eeda280955ebd6bd83c2dbecfc46fb53c10198f05d107511b50",
    "assets/forearm_0.obj": "64c049a55149c2ab355594d52302b53d3e34da3677ceaa1917c427cde7743146",
    "assets/forearm_1.obj": "a96fe203015cf532b193f414cd01268c7c36795e51a837dd33afd122334f81f2",
    "assets/forearm_2.obj": "05b436505fc595aeab26675590c2b56b88a65b2d52d6352096fed9f07cb4c4ca",
    "assets/forearm_3.obj": "fa31af19cfad7a765b62e8a2d5931cb014b88de84195a7850b4e5ee902112e9a",
    "assets/shoulder_0.obj": "477387a7e7312782a6040484a3c2c2fcee33f40109f419076e31b6f6e1692c68",
    "assets/shoulder_1.obj": "8537bba02804640ddf6e260f79fe66e895b3229ed3d44298a95e8e027eb5d435",
    "assets/shoulder_2.obj": "291714518416bb8f0bafbf123867db011ecbf5146a05245ca5893ee8c57d4e21",
    "assets/upperarm_0.obj": "14143d4f1175a7dbacc8e2f2f98f1cac5a2b2e238cd46cd03654d31f2610eb53",
    "assets/upperarm_1.obj": "272899e927f4a32b7c25e34560ec70654c0346cc8ed1c616c0555f3f53b32d14",
    "assets/upperarm_2.obj": "86c05350d60eb0e7e28a81b544267478b7db997baba41cef19088ebbeffecfa1",
    "assets/upperarm_3.obj": "b257dab441e6fab64ea03b4b87029d8a96554ad1a513cce944d56acba0ad948a",
    "assets/wrist1_0.obj": "7ef0c59b5c5d56a9902435c9a058b27d2a38c85fe2bae02d00a9284dd1f4d519",
    "assets/wrist1_1.obj": "ee6d5c562e6becef94109b0543329080d285d1aef521a01ed98e18a5bf1e8684",
    "assets/wrist1_2.obj": "88c66dc64f15391287147d50add37729a3f41dadd80b1f859cf2cb6d45daf32a",
    "assets/wrist2_0.obj": "2ac2e2e39d8f7005bc3b3ab26cd61634be2e14930074615da5318b9ee7c569a8",
    "assets/wrist2_1.obj": "a721d06dc61d3b3a8ec58c035c9e3358ed30d6991a72e077d8abf3c3c203b633",
    "assets/wrist2_2.obj": "6df4335c8bd5e881fda2c224f770115ffe9ddd0cd321ebe3c0a4a310796f0987",
    "assets/wrist3.obj": "0e51748f9c93bd66604360a5cf7e2e8a6e754550be64076333ff4fc19ec90c61",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch(dest: Path) -> Path:
    """Download (or re-check) every file into dest/<MODEL_DIR_NAME>; returns the model folder."""
    model_dir = dest / MODEL_DIR_NAME
    for rel, digest in FILES.items():
        target = model_dir / rel
        if target.exists() and sha256(target) == digest:
            print(f"  ok      {rel}")
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(BASE + rel, timeout=60) as r:
            data = r.read()
        got = hashlib.sha256(data).hexdigest()
        if got != digest:
            raise SystemExit(f"checksum mismatch for {rel}: expected {digest}, got {got}. Nothing "
                             "from this download was kept.")
        tmp = target.with_suffix(target.suffix + ".part")
        tmp.write_bytes(data)
        tmp.replace(target)
        print(f"  fetched {rel} ({len(data) / 1e6:.1f} MB)")
    return model_dir


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dest", type=Path, default=None,
                    help="cache folder (default: $DEVJOURNEY_MENAGERIE_DIR or "
                         "~/.cache/devjourney/mujoco_menagerie)")
    args = ap.parse_args(argv)
    dest = args.dest or menagerie_root()
    print(f"MuJoCo Menagerie UR5e @ {MENAGERIE_COMMIT[:8]} -> {dest}")
    model_dir = fetch(dest)
    print(f"Done: {model_dir / 'scene.xml'}\nLicence: BSD-3-Clause, see {model_dir / 'LICENSE'}.")
    if args.dest is not None:
        print(f"Point the labs at it with: export DEVJOURNEY_MENAGERIE_DIR={dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
