**Writing your own tests**

A *test* is a small function that runs your code with one example and checks the answer with `assert`. If the answer is right, nothing happens. If it's wrong, `assert` raises an `AssertionError` and the test fails. Here, any function whose name starts with `test_` is a test.

Think of a smoke alarm: it sits quietly while everything is fine, and it's loud the moment something goes wrong. A test you never see fail is like an alarm with no battery.

```python
def double(n):
    return n * 2

def test_double_of_three():
    assert double(3) == 6, "double(3) should be 6"

test_double_of_three()
print("passed")  # passed
```

Pick examples where a mistake would show: if `double` wrongly did `n + 2`, then `double(2)` would still be 4, but `double(3)` catches it.

**X and the value just below it.** Rules break at their edges. For "X or more", test exactly X *and* the value just below it, not only numbers far away from the edge.
