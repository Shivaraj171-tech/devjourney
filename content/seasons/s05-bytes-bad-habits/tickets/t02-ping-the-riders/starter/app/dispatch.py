"""Dispatch: what to do when no rider accepts an order.

When nobody accepts, the app waits and pings the riders again. Each wait is
twice as long as the one before, so we don't flood riders' phones.

Written by Byte 🤖. Version 1 never stopped (it froze dispatch at 2 a.m.);
this is its hotfix.
"""


def retry_waits(max_wait):
    """The seconds to wait before each retry, in order.

    Start at 1 second and double every time: 1, 2, 4, 8, ...
    Keep going while the wait is max_wait seconds or less. For example:
      retry_waits(8)  -> [1, 2, 4, 8]
      retry_waits(10) -> [1, 2, 4, 8]
      retry_waits(0)  -> []  (dispatch is told not to wait at all)
    """
    waits = []
    wait = 1
    while wait <= max_wait:
        wait = wait * 2
        waits.append(wait)
    return waits


def total_wait(max_wait):
    """How many seconds an order can wait for a rider in total before
    the kitchen phones one, e.g. total_wait(8) -> 15 (1 + 2 + 4 + 8)."""
    return sum(retry_waits(max_wait))
