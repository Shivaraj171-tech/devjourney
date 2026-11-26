"""The singularity monitor in Grabby-6's motion controller.

Resolved-rate control: to move the gripper with twist V, run the joints at qdot = J^-1 V.
Near a singularity J^-1 blows up, so the controller watches the CONDITION NUMBER

    kappa = sigma_max / sigma_min        (1: perfectly round, infinity: singular)

where the sigma are J's singular values: the square roots of the eigenvalues of J^T J.
It slows down above KAPPA_SLOW and stops above KAPPA_STOP.

Units: J is ur5e_jacobian(q), lengths in METRES. Its top three rows are m/s per rad/s,
its bottom three rad/s per rad/s. With rows in mixed units kappa is NOT scale-free: the
same pose in millimetres gives a kappa about 200x bigger. So KAPPA_SLOW and KAPPA_STOP
are only valid for J in metres and radians. (A unit-free monitor divides the linear rows
by a characteristic length, or weights the rows, before taking kappa.)
"""
import math

from rigid.mat import matmul, transpose
from vel.ellipsoid import sym_eig
from vel.linalg import solve

KAPPA_SLOW = 50.0
KAPPA_STOP = 200.0


def singular_values(J):
    """J's singular values, biggest first: sqrt of the eigenvalues of J^T J."""
    values, _ = sym_eig(matmul(transpose(J), J))
    return [math.sqrt(max(0.0, lam)) for lam in values]


def condition_number(J):
    """sigma_max / sigma_min (infinity when J is singular)."""
    s = singular_values(J)
    if s[-1] <= 1e-12 * s[0]:
        return math.inf
    return s[0] / s[-1]


def guard(J):
    """("go" | "slow" | "stop", kappa): what the controller does at this pose."""
    kappa = condition_number(J)
    if kappa > KAPPA_STOP:
        return "stop", kappa
    if kappa > KAPPA_SLOW:
        return "slow", kappa
    return "go", kappa


def joint_speeds(J, V):
    """Resolved rate: qdot with J qdot = V (a square J)."""
    return solve(J, V)
