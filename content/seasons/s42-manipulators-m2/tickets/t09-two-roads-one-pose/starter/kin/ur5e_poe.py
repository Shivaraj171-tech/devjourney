"""The UR5e two ways: its home pose and screw axes read off the DH frames, then PoE.

At the home configuration (every joint at 0), joint i turns about the z axis of DH
frame i-1, through that frame's origin. So the screw axes come straight from the frames.
"""
from rigid.transform import translation_of
from kin.dh import fk_dh_frames
from kin.poe import fk_poe, revolute_screw
from kin.ur5e import UR5E_DH


def screws_from_dh(table):
    """(M, [S1, ..., Sn]): the home pose of the last frame, and each joint's screw axis."""
    frames = fk_dh_frames(table, [0.0] * len(table))
    M = frames[-1]
    screws = []
    for T in frames[1:]:  # Byte: joint i turns about the z axis of frame i
        z = [T[0][2], T[1][2], T[2][2]]
        screws.append(revolute_screw(z, translation_of(T)))
    return M, screws


def ur5e_poe(q):
    """The UR5e's flange pose by the product of exponentials."""
    M, screws = screws_from_dh(UR5E_DH)
    return fk_poe(M, screws, q)
