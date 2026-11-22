import math

from lab import viz

from rigid.frames import box_in_gripper, chain, gripper_in_base
from rigid.mat import identity
from rigid.rotations import rot_y, rot_z
from rigid.transform import T_apply, make_T, translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


# Grabby: the shoulder sits 0.4 m above the base, turned 90 deg about z (facing the shelf on its left).
T_BASE_SHOULDER = make_T(rot_z(math.pi / 2), (0.0, 0.0, 0.4))
# The gripper, as the shoulder sees it: 0.5 m along the shoulder's x, tipped down 90 deg (pointing at the floor).
T_SHOULDER_GRIPPER = make_T(rot_y(math.pi / 2), (0.5, 0.0, 0.0))
BOX = (0.05, 0.5, 0.1)  # the box, in the base frame (the camera reports it there)


def test_gripper_in_base():
    T = gripper_in_base(T_BASE_SHOULDER, T_SHOULDER_GRIPPER)
    got = translation_of(T)
    # The shoulder's x axis points along base y, so 0.5 m along it is (0, 0.5) in the base, 0.4 m up.
    assert max(abs(g - w) for g, w in zip(got, (0.0, 0.5, 0.4))) < 1e-9, f"the gripper should be at (0.00, 0.50, 0.40) in the base, got {fmt(got)}"


def test_chain_cancels_inner_names():
    T_a_b = make_T(rot_z(0.3), (1.0, 0.0, 0.0))
    T_b_c = make_T(identity(3), (0.0, 2.0, 0.0))
    T_c_d = make_T(rot_y(0.5), (0.0, 0.0, 3.0))
    p_d = (0.1, 0.2, 0.3)
    step_by_step = T_apply(T_a_b, T_apply(T_b_c, T_apply(T_c_d, p_d)))
    got = T_apply(chain(T_a_b, T_b_c, T_c_d), p_d)
    assert max(abs(a - b) for a, b in zip(got, step_by_step)) < 1e-9, "chain(T_a_b, T_b_c, T_c_d) must equal T_a_d"


def test_where_is_the_box_in_the_gripper_frame():
    T_base_gripper = gripper_in_base(T_BASE_SHOULDER, T_SHOULDER_GRIPPER)
    got = box_in_gripper(T_base_gripper, BOX)
    frames = []
    for i in range(31):
        a = math.pi / 2 * i / 30
        T_sg = make_T(rot_y(a), (0.5, 0.0, 0.0))
        frames.append([identity(4), T_BASE_SHOULDER, chain(T_BASE_SHOULDER, T_sg)])
    box_drawn = T_apply(T_base_gripper, got)  # where the box would be if YOUR gripper-frame answer were right
    viz.frames3d("box in gripper", frames, labels=["base", "shoulder", "gripper"], points=[BOX + ("box",), tuple(box_drawn) + ("your answer",)],
                 title="Where is the box, as the gripper sees it?",
                 caption="Pink dots: the real box, and your box_in_gripper() answer drawn back in the base frame. Right: they meet.")
    # The gripper sits at (0, 0.5, 0.4) pointing down: its x axis is base -z and its y axis is base -x.
    # The box is 0.3 m below it (+0.3 along the gripper's x) and 0.05 m along base +x (-0.05 along its y).
    want = (0.3, -0.05, 0.0)
    assert max(abs(g - w) for g, w in zip(got, want)) < 1e-9, (
        f"the box should be at {fmt(want)} in the gripper frame (0.30 m straight ahead of the fingers), got {fmt(got)}. "
        "To go from base coordinates to gripper coordinates you need T_gripper_base = T_inv(T_base_gripper)")


def test_round_trip_through_the_gripper():
    T_base_gripper = gripper_in_base(T_BASE_SHOULDER, T_SHOULDER_GRIPPER)
    back = T_apply(T_base_gripper, box_in_gripper(T_base_gripper, BOX))
    assert max(abs(a - b) for a, b in zip(back, BOX)) < 1e-9, f"base -> gripper -> base should give the box back {fmt(BOX)}, got {fmt(back)}"
