"""lab: let a test (or learner code) SHOW what the robot code does.

Robotics Lab tickets draw their results in the Lab viewer next to the CI checks
(components/LabViewer.tsx). Anything that can `import` Python can use it:

    from lab import viz

    viz.arm(frames, lengths=(1.0, 0.8), target=(1.2, 0.5))   # animate an n-link planar arm
    viz.chart("Loss", xs, ys, label="train")                  # a line chart (same name: one more line)
    viz.grid("Q-values", rows, path=[(0, 0), (0, 1)])        # a heat-map grid (e.g. a Q-table)
    viz.points("Grasps", [(x, y), ...], labels=[0, 1, ...])   # a scatter plot of labelled points
    viz.frames3d("Box", [[T_world, T_box], ...])               # 3D coordinate frames (4x4 transforms), animated
    viz.arm3d([[T_01, T_12, T_23], ...])                       # a 3D arm from link-to-link transforms
    viz.arm3d(..., ellipsoids=[...], arrows=[...])             # + velocity ellipsoids and arrows (3D)

Each call records one item, keyed by its name (calling again with the same name
replaces it, except chart(), which adds a line). test_runner.run_tests() clears
the record before a run and returns it as the run's "viz" list, so the
browser and the validator see exactly the same thing.

Everything is plain JSON, rounded and capped (see the MAX_* limits), so a test
that records too much never slows the page down: long lists are evenly thinned
(the last value is always kept) and the item says `"truncated": true`.
Non-finite numbers (inf, nan: a loss that exploded) become null.

Angles are in RADIANS, like math.sin / math.cos. Standard library only.
"""

import json
import math

MAX_ITEMS = 12          # items per run
MAX_FRAMES = 400        # arm frames per item
MAX_POINTS = 600        # points per chart line, scatter or path
MAX_SERIES = 6          # lines per chart
MAX_LINKS = 6           # links per arm
MAX_GRID = 40           # rows and columns per grid
MAX_TEXT = 120          # characters per title / label / caption
MAX_TRANSFORMS = 12     # 4x4 transforms per 3D frame
MAX_LINES = 24          # static line segments per 3D item
MAX_ELLIPSOIDS = 4      # ellipsoids per 3D frame
MAX_ARROWS = 8          # arrows per 3D frame
MAX_JSON = 200_000      # characters of JSON for the whole run
DIGITS = 4              # decimals kept

_items = {}  # name -> item, in the order they were first recorded


def reset():
    """Forget everything recorded so far (test_runner does this before each run)."""
    _items.clear()


def collect():
    """Everything recorded since reset(), as a JSON-safe list, within MAX_JSON."""
    items = [dict(item) for item in _items.values()]
    while items and len(json.dumps(items)) > MAX_JSON:
        if not _thin_all(items):
            items.pop()  # still too big after thinning: drop the last item
    return items


# ---------- cleaning helpers ----------

def _num(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value):
        return None
    return round(value, DIGITS)


def _text(value, default=""):
    if value is None:
        return default
    return str(value)[:MAX_TEXT]


def _pair(value):
    """(x, y) -> [x, y], or None."""
    if value is None:
        return None
    try:
        x, y = value
    except (TypeError, ValueError):
        raise TypeError(f"expected an (x, y) pair, got {value!r}") from None
    return [_num(x), _num(y)]


def _thin(values, limit):
    """At most `limit` evenly spaced values, always keeping the first and the last."""
    values = list(values)
    if len(values) <= limit:
        return values, False
    step = (len(values) - 1) / (limit - 1)
    return [values[round(i * step)] for i in range(limit)], True


def _thin_all(items):
    """Halve every long list once. Returns False when nothing could be thinned."""
    changed = False
    for item in items:
        for key in ("frames", "targets", "ghost", "points", "labels", "path", "ellipsoids", "arrows"):
            if item.get("kind") == "frames3d" and key in ("labels", "points"):
                continue  # one per transform / static marks: never thinned
            if isinstance(item.get(key), list) and len(item[key]) > 8:
                item[key] = _thin(item[key], max(8, len(item[key]) // 2))[0]
                item["truncated"] = changed = True
        for series in item.get("series", []):
            if len(series["xs"]) > 8:
                keep = max(8, len(series["xs"]) // 2)
                series["xs"] = _thin(series["xs"], keep)[0]
                series["ys"] = _thin(series["ys"], keep)[0]
                item["truncated"] = changed = True
    return changed


def _record(name, item):
    name = _text(name) or item["kind"]
    if name not in _items and len(_items) >= MAX_ITEMS:
        return  # over the item limit: quietly ignored
    item["name"] = name
    _items[name] = item


# ---------- the public API ----------

class _Viz:
    """The drawing functions (use them as viz.arm(...), viz.chart(...), ...)."""

    def arm(self, frames, lengths=(1.0, 0.8), *, name="arm", title=None, target=None,
            targets=None, ghost=None, marks=None, limits=None, caption=None, trail=True):
        """Animate a planar arm with len(lengths) links, its base at (0, 0).

        frames:  a list of poses; each pose is one joint angle per link, in radians.
                 Joint 1 is measured from the x axis, every other joint from the link
                 before it (so the gripper's direction is the SUM of the angles).
        target:  (x, y) the arm should reach (drawn as a target marker).
        targets: optional, one (x, y) or None per frame (a target that moves).
        ghost:   optional, one (x, y) or None per frame: where YOUR code says the gripper
                 is (drawn as a cross, so you can see it next to the real arm).
        marks:   optional list of (x, y) or (x, y, label) or (x, y, label, ok) points.
        limits:  optional (low, high) radians per joint: the viewer shades the area the
                 gripper can reach within them (without limits: the full ring).
        trail:   draw the path the gripper has taken so far (turn it off when the frames
                 jump from one scene to the next).
        """
        lengths = [_num(v) for v in list(lengths)[:MAX_LINKS]]
        if not lengths or any(v is None or v <= 0 for v in lengths):
            raise ValueError(f"viz.arm: lengths must be positive numbers, got {lengths!r}")
        poses = []
        for pose in frames:
            pose = list(pose) if isinstance(pose, (list, tuple)) else [pose]
            if len(pose) != len(lengths):
                raise ValueError(f"viz.arm: each frame needs {len(lengths)} joint angles, got {pose!r}")
            poses.append([_num(a) for a in pose])
        if not poses:
            raise ValueError("viz.arm: frames is empty")
        poses, truncated = _thin(poses, MAX_FRAMES)
        item = {"kind": "arm", "title": _text(title, "Grabby's arm"), "lengths": lengths, "frames": poses,
                "target": _pair(target), "caption": _text(caption), "trail": bool(trail), "truncated": truncated}
        for key, per_frame in (("targets", targets), ("ghost", ghost)):
            if per_frame is not None:
                per_frame = [_pair(p) for p in per_frame]
                if len(per_frame) != len(frames):
                    raise ValueError(f"viz.arm: {key} needs one entry per frame ({len(frames)}), got {len(per_frame)}")
                item[key] = _thin(per_frame, MAX_FRAMES)[0]
        if marks:
            item["marks"] = [_mark(m) for m in list(marks)[:MAX_POINTS]]
        if limits is not None:
            limits = [[_num(lo), _num(hi)] for lo, hi in limits]
            if len(limits) != len(lengths):
                raise ValueError(f"viz.arm: limits needs one (low, high) per joint, got {len(limits)}")
            item["limits"] = limits
        _record(name, item)

    def chart(self, name, xs, ys, *, label=None, x_label="", y_label="", hline=None, log=False, title=None):
        """A line chart. Calling it again with the same name adds another line (at most MAX_SERIES).

        hline: optional y value drawn as a dashed line (a target or a threshold).
        log:   plot y on a log scale (good for a loss that falls fast).
        """
        xs, ys = list(xs), list(ys)
        if len(xs) != len(ys):
            raise ValueError(f"viz.chart: xs and ys must be the same length ({len(xs)} vs {len(ys)})")
        thin_xs, truncated = _thin([_num(x) for x in xs], MAX_POINTS)
        thin_ys = _thin([_num(y) for y in ys], MAX_POINTS)[0]
        series = {"label": _text(label, _text(name)), "xs": thin_xs, "ys": thin_ys}
        key = _text(name) or "chart"
        item = _items.get(key)
        if item is None or item["kind"] != "chart":
            item = {"kind": "chart", "title": _text(title, key), "x_label": _text(x_label), "y_label": _text(y_label),
                    "hline": _num(hline) if hline is not None else None, "log": bool(log), "series": [], "truncated": False}
            _record(key, item)
            if key not in _items:
                return
        if len(item["series"]) >= MAX_SERIES:
            return
        item["series"].append(series)
        item["truncated"] = item["truncated"] or truncated

    def grid(self, name, values, *, path=None, start=None, goal=None, arrows=None, x_label="", y_label="", title=None):
        """A heat-map grid: values[row][col] numbers (None for an empty cell).

        path:   optional list of (row, col) cells (e.g. the route a policy takes).
        start, goal: optional (row, col) cells to mark.
        arrows: optional rows of short strings (e.g. "→") drawn in the cells.
        """
        rows = [[_num(v) if v is not None else None for v in list(row)[:MAX_GRID]] for row in list(values)[:MAX_GRID]]
        item = {"kind": "grid", "title": _text(title, _text(name)), "values": rows,
                "x_label": _text(x_label), "y_label": _text(y_label),
                "start": _cell(start), "goal": _cell(goal), "truncated": False}
        if path is not None:
            item["path"], item["truncated"] = _thin([_cell(c) for c in path], MAX_POINTS)
        if arrows is not None:
            item["arrows"] = [[_text(a)[:2] for a in list(row)[:MAX_GRID]] for row in list(arrows)[:MAX_GRID]]
        _record(name, item)

    def points(self, name, points, *, labels=None, x_label="", y_label="", title=None, classes=("0", "1")):
        """A scatter plot. labels: optional 0/1 per point (coloured by class, named by `classes`)."""
        pts = [_pair(p) for p in points]
        item = {"kind": "points", "title": _text(title, _text(name)), "x_label": _text(x_label), "y_label": _text(y_label),
                "classes": [_text(c) for c in list(classes)[:2]], "truncated": False}
        item["points"], item["truncated"] = _thin(pts, MAX_POINTS)
        if labels is not None:
            labels = [1 if lab else 0 for lab in labels]
            if len(labels) != len(pts):
                raise ValueError(f"viz.points: labels needs one entry per point ({len(pts)}), got {len(labels)}")
            item["labels"] = _thin(labels, MAX_POINTS)[0]
        _record(name, item)


    def frames3d(self, name, frames, *, axes=True, links=True, labels=None, points=None, lines=None,
                 target=None, trail=None, scale=None, title=None, caption=None, ellipsoids=None, arrows=None):
        """Animate 3D coordinate frames: each frame of the animation is a list of 4x4
        homogeneous transforms (nested lists, rows first), each one a pose in the WORLD frame.

        The viewer draws each transform as a triad at its origin: x red, y green, z blue,
        each tip labelled "x", "y", "z". A single scene (a list of 4x4s) or a single 4x4
        is fine too (one still frame).

        axes:   True (a triad on every transform), False, or one True/False per transform.
        links:  True (a line from each transform's origin to the next one's: a chain),
                False, or a list of (i, j) index pairs to join.
        labels: optional names, one per transform (e.g. ["base", "shoulder", "gripper"]).
        points: optional static (x, y, z) or (x, y, z, label) points (a box, a bin...).
        lines:  optional static ((x, y, z), (x, y, z)) segments (e.g. a rotation axis).
        target: optional 4x4 pose (drawn as a dashed triad) or (x, y, z) point to reach.
        trail:  optional transform index whose origin leaves a trail (e.g. -1: the last one).
        scale:  triad length in metres (default: picked from the scene's size).
        ellipsoids: optional ellipsoids (e.g. a manipulability / velocity ellipsoid), each a dict
                {"center": (x, y, z), "axes": 3x3 matrix whose COLUMNS are the principal directions,
                 "radii": (r1, r2, r3), "label": "v"} (3 rows of 2 columns + 2 radii: a flat ellipse).
                Drawn as a wireframe (latitude and longitude rings) with its principal axes; the
                text summary gives the radii and the condition number (largest / smallest radius).
                A list of dicts: the same ellipsoids in every frame. A list of LISTS (or None), one
                per frame: they change as the arm moves (at most MAX_ELLIPSOIDS per frame).
        arrows: optional arrows (a velocity, a force), each a dict {"start": (x, y, z),
                "vec": (dx, dy, dz), "label": "v"}: from start to start + vec. Static or one list
                per frame, like ellipsoids (at most MAX_ARROWS per frame).

        The matrices are drawn as they are, even when they are not proper rotations
        (a quaternion that drifted shows as stretched axes). A bottom row that is not
        [0, 0, 0, 1] is flagged in the viewer.
        """
        scenes = _scenes(frames)
        count = max(len(s) for s in scenes)
        item = {"kind": "frames3d", "style": "frames", "title": _text(title, _text(name) or "Frames"),
                "caption": _text(caption), "truncated": False, "bad_bottom": False}
        cleaned = []
        for f, scene in enumerate(scenes):
            row = []
            for k, T in enumerate(scene):
                rows, bad = _transform(T, f"viz.frames3d: frame {f}, transform {k}")
                item["bad_bottom"] = item["bad_bottom"] or bad
                row.append(rows)
            cleaned.append(row)
        item["frames"], item["truncated"] = _thin(cleaned, MAX_FRAMES)
        item["axes"] = _per_transform(axes, count, "axes")
        if labels is not None:
            item["labels"] = [_text(lab) for lab in list(labels)[:MAX_TRANSFORMS]]
        if links is True:
            item["links"] = [[i, i + 1] for i in range(count - 1)]
        elif links:
            item["links"] = [[int(i) % count, int(j) % count] for i, j in list(links)[:MAX_TRANSFORMS * 2]]
        else:
            item["links"] = []
        if points:
            item["points"] = [_point3(p) for p in list(points)[:MAX_POINTS]]
        if lines:
            item["lines"] = [[_vec3(a), _vec3(b)] for a, b in list(lines)[:MAX_LINES]]
        if target is not None:
            item["target"] = _target3(target)
        if trail is not None:
            item["trail"] = int(trail) % count
        if scale is not None:
            item["scale"] = _num(scale)
        if ellipsoids is not None:
            item["ellipsoids"] = _thin(_per_frame(ellipsoids, len(scenes), "ellipsoids", MAX_ELLIPSOIDS, _ellipsoid),
                                       MAX_FRAMES)[0]
        if arrows is not None:
            item["arrows"] = _thin(_per_frame(arrows, len(scenes), "arrows", MAX_ARROWS, _arrow), MAX_FRAMES)[0]
        _record(name, item)

    def arm3d(self, frames, *, name="arm3d", local=True, labels=None, points=None, lines=None, target=None,
              title=None, caption=None, scale=None, trail=True, axes="ends", ellipsoids=None, arrows=None):
        """A 3D arm: each frame is one pose, given as a list of 4x4 transforms.

        local=True (default): the transforms are link to link (T_0_1, T_1_2, ...): the viewer
                 gets their running product T_0_1, T_0_1 T_1_2, ... (each joint in the world).
        local=False: they already are world poses of each joint.
        The base (the identity) is added first, so the arm starts at the origin. Links are
        drawn as a thick arm, with triads at the base and the gripper (the last transform).
        axes:    "ends" (default: base and gripper), True (a triad on EVERY joint frame, e.g. to
                 see each DH frame), False, or one True/False per frame (base first).
        ellipsoids, arrows: as in frames3d, in world coordinates (e.g. the velocity ellipsoid at
                 the gripper, the gripper's velocity).
        """
        poses = []
        for f, pose in enumerate(_scenes(frames)):
            joints = [_identity4()]
            for k, T in enumerate(pose):
                rows, _bad = _transform(T, f"viz.arm3d: frame {f}, transform {k}", keep_bottom=True)
                joints.append(_mul4(joints[-1], rows) if local else rows)
            poses.append(joints)
        n = len(poses[0])
        if axes == "ends":
            axes = [i == 0 or i == n - 1 for i in range(n)]
        names = list(labels) if labels is not None else ["base"] + [f"joint {i}" for i in range(1, n - 1)] + ["gripper"]
        if labels is not None and len(names) == n - 1:
            names = ["base"] + names
        self.frames3d(name, poses, axes=axes, links=True, labels=names, points=points, lines=lines, target=target,
                      trail=(n - 1) if trail else None, scale=scale, title=_text(title, "Grabby's arm (3D)"),
                      caption=caption, ellipsoids=ellipsoids, arrows=arrows)
        if name in _items and _items[name]["kind"] == "frames3d":
            _items[name]["style"] = "arm"


# ---------- 3D helpers ----------

def _is_matrix(value):
    return isinstance(value, (list, tuple)) and len(value) > 0 and all(
        isinstance(r, (list, tuple)) and len(r) > 0 and not isinstance(r[0], (list, tuple)) for r in value)


def _scenes(frames):
    """frames as a list of scenes (lists of transforms): accepts one 4x4, one scene, or many."""
    frames = list(frames) if isinstance(frames, (list, tuple)) else frames
    if not isinstance(frames, list) or not frames:
        raise ValueError("viz.frames3d: frames is empty (give a list of frames, each a list of 4x4 transforms)")
    if _is_matrix(frames):
        frames = [[frames]]  # a single 4x4
    elif all(_is_matrix(s) for s in frames):
        frames = [frames]  # a single scene
    scenes = []
    for f, scene in enumerate(frames):
        if not isinstance(scene, (list, tuple)) or not scene:
            raise ValueError(f"viz.frames3d: frame {f} must be a non-empty list of 4x4 transforms")
        scenes.append(list(scene)[:MAX_TRANSFORMS])
    return scenes


def _transform(T, where, keep_bottom=False):
    """A 4x4 as its top three rows (12 numbers), and whether its bottom row was off."""
    try:
        rows = [list(r) for r in T]
    except TypeError:
        raise ValueError(f"{where} is not a 4x4 matrix (4 rows of 4 numbers), got {T!r}") from None
    if len(rows) != 4 or any(len(r) != 4 for r in rows):
        shape = f"{len(rows)} rows of {sorted({len(r) for r in rows})} numbers"
        raise ValueError(f"{where} is not a 4x4 matrix (4 rows of 4 numbers), got {shape}")
    nums = [[_num(v) for v in r] for r in rows]
    bottom = nums[3]
    bad = any(v is None for v in bottom) or any(abs(v - w) > 1e-6 for v, w in zip(bottom, (0, 0, 0, 1)) if v is not None)
    if keep_bottom:
        return [[0.0 if v is None else v for v in r] for r in nums], bad
    return [v for r in nums[:3] for v in r], bad


def _identity4():
    return [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]


def _mul4(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def _vec3(value):
    try:
        x, y, z = list(value)[:3]
    except (TypeError, ValueError):
        raise TypeError(f"expected an (x, y, z) point, got {value!r}") from None
    return [_num(x), _num(y), _num(z)]


def _point3(p):
    p = list(p)
    if len(p) < 3:
        raise TypeError(f"viz.frames3d: a point needs (x, y, z), got {p!r}")
    out = {"x": _num(p[0]), "y": _num(p[1]), "z": _num(p[2]), "label": _text(p[3]) if len(p) > 3 else ""}
    return out


def _target3(target):
    if _is_matrix(target):
        return {"pose": _transform(target, "viz.frames3d: target")[0]}
    return {"point": _vec3(target)}


def _per_transform(flag, count, key):
    if flag is True or flag is False:
        return [bool(flag)] * count
    flags = [bool(v) for v in list(flag)[:MAX_TRANSFORMS]]
    return flags + [False] * (count - len(flags))


def _per_frame(values, count, key, cap, clean):
    """Static (a list of dicts: every frame) or per frame (a list of lists or None, one per frame)."""
    values = list(values) if isinstance(values, (list, tuple)) else values
    if not isinstance(values, list):
        raise TypeError(f"viz.frames3d: {key} must be a list of dicts, or one list (or None) per frame")
    if all(isinstance(v, dict) for v in values):
        static = [clean(v) for v in values[:cap]]
        return [static] * count
    if len(values) != count or not all(v is None or isinstance(v, (list, tuple)) for v in values):
        raise ValueError(f"viz.frames3d: {key} per frame needs one list (or None) per frame ({count}), "
                         f"got {len(values)} entries (a static list holds only dicts)")
    return [[clean(v) for v in list(f or [])[:cap]] for f in values]


def _ellipsoid(e):
    """{center, axes (3 rows x 2 or 3 columns), radii, label} as JSON, axes as a list of columns."""
    if not isinstance(e, dict):
        raise TypeError(f"viz: an ellipsoid is a dict with center, axes and radii, got {e!r}")
    missing = [k for k in ("center", "axes", "radii") if k not in e]
    if missing:
        raise ValueError(f"viz: an ellipsoid needs center, axes and radii (missing {', '.join(missing)})")
    try:
        rows = [list(r) for r in e["axes"]]
        radii = [_num(r) for r in e["radii"]]
    except TypeError:
        raise ValueError(f"viz: an ellipsoid's axes must be a 3x3 matrix (columns: the directions), got {e['axes']!r}") from None
    k = len(rows[0]) if rows else 0
    if len(rows) != 3 or k not in (2, 3) or any(len(r) != k for r in rows):
        raise ValueError("viz: an ellipsoid's axes must be 3 rows of 3 numbers (or 3 rows of 2: an ellipse), "
                         f"the columns being the principal directions, got {rows!r}")
    if len(radii) != k or any(r is None or r < 0 for r in radii):
        raise ValueError(f"viz: an ellipsoid needs {k} finite, non-negative radii (one per axis), got {e['radii']!r}")
    cols = [[_num(rows[i][j]) or 0.0 for i in range(3)] for j in range(k)]
    return {"center": _vec3(e["center"]), "axes": cols, "radii": radii, "label": _text(e.get("label"))}


def _arrow(a):
    if not isinstance(a, dict) or "start" not in a or "vec" not in a:
        raise ValueError(f"viz: an arrow is a dict with start (x, y, z) and vec (dx, dy, dz), got {a!r}")
    return {"start": _vec3(a["start"]), "vec": _vec3(a["vec"]), "label": _text(a.get("label"))}


def _mark(m):
    m = list(m)
    if len(m) < 2:
        raise TypeError(f"viz.arm: a mark needs at least (x, y), got {m!r}")
    out = {"x": _num(m[0]), "y": _num(m[1]), "label": _text(m[2]) if len(m) > 2 else ""}
    if len(m) > 3:
        out["ok"] = bool(m[3])
    return out


def _cell(c):
    if c is None:
        return None
    r, col = c
    return [int(r), int(col)]


viz = _Viz()
