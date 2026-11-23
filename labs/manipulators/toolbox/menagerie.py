"""Optional: Google DeepMind's MuJoCo Menagerie UR5e (real meshes), if you downloaded it.

Not part of any lab. `python labs/manipulators/tools/fetch_menagerie_ur5e.py` downloads it (BSD-3-
Clause, pinned commit, checksummed) into a cache outside the repo; nothing here downloads.

What we checked (MuJoCo 4.0.1, commit below): the model loads headless and has the same zero
pose, joint directions and base frame as our UR5E_DH ("attachment_site" = DH frame 6, world =
UR base frame), with the flange within 1.5 mm of our DH FK over 200 random poses: Menagerie
rounds the offsets (shoulder 0.163, wrist 0.127/0.1/0.1 m) where Universal Robots' table says
0.1625, 0.1333, 0.0997, 0.0996. Its link masses (3.7, 8.393, 2.275, 1.219, 1.219, 0.1889 kg)
are the older ur_e_description (CB-series UR5) values, NOT Universal Robots' UR5e masses in
toolbox/robots.py (3.761, 8.058, 2.846, 1.37, 1.3, 0.365 kg). So we use it for looks and for a
kinematic/servo replay, never as the dynamics referee.

    menagerie_root()        cache folder ($DEVJOURNEY_MENAGERIE_DIR or ~/.cache/devjourney/...)
    menagerie_ur5e_scene()  Path to scene.xml, or None if not downloaded
    load_menagerie_ur5e()   (model, data), or None if MuJoCo or the model is missing
"""

from __future__ import annotations

import os
from pathlib import Path

MENAGERIE_COMMIT = "370c43965323c0944b433b202aac5058b5f907a9"
MODEL_DIR_NAME = "universal_robots_ur5e"
FLANGE_SITE = "attachment_site"
# Menagerie's joint order is ours (shoulder_pan ... wrist_3); its "home" keyframe is
# (-pi/2, -pi/2, pi/2, -pi/2, -pi/2, 0).


def menagerie_root() -> Path:
    env = os.environ.get("DEVJOURNEY_MENAGERIE_DIR")
    return Path(env).expanduser() if env else Path.home() / ".cache" / "devjourney" / "mujoco_menagerie"


def menagerie_ur5e_scene():
    p = menagerie_root() / MODEL_DIR_NAME / "scene.xml"
    return p if p.is_file() and (p.parent / "ur5e.xml").is_file() else None


def load_menagerie_ur5e():
    scene = menagerie_ur5e_scene()
    if scene is None:
        return None
    try:
        import mujoco
    except ImportError:
        return None
    model = mujoco.MjModel.from_xml_path(str(scene))
    return model, mujoco.MjData(model)
