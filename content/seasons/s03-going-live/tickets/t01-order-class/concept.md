**Classes**

A *class* is a blueprint for making your own kind of value. It bundles data (*attributes*) with functions that work on that data (*methods*). Each value made from a class is an *object*, and every object has its own copy of the data.

Think of a cookie cutter: the class is the cutter, the objects are the cookies. Every cookie has the same shape, but you can decorate each one differently.

```python
class Counter:
    def __init__(self, start):
        self.count = start
    def add_one(self):
        self.count = self.count + 1
c = Counter(5)
c.add_one()
print(c.count)  # 6
```

`__init__` runs when you write `Counter(5)` and sets up the new object. Inside a method, `self` is the object the method was called on, so `c.add_one()` changes `c.count`.

**Watch out:** Inside a method, reach the object's data through `self`. Writing `count` instead of `self.count` looks for an ordinary variable and gives a `NameError`.
