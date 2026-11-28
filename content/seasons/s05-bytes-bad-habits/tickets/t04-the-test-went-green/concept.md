**Nested data**

Real data is often a container inside a container: a dictionary of categories, where each category holds a *list* of dishes, and each dish is itself a *dictionary*. You reach inside one level at a time, from the outside in.

Think of a filing cabinet: the cabinet has drawers (categories), each drawer holds folders (dishes), and each folder has labelled pages (`"name"`, `"price"`). "The name of the first pizza" means: drawer `"pizza"`, first folder, page `"name"`.

```python
board = {"pizza": [{"name": "marinara", "vegan": True}],
         "drinks": [{"name": "lemonade", "vegan": True}]}
print(board["pizza"][0]["name"])  # marinara
for category in board:
    for dish in board[category]:
        print(category, dish["name"])  # pizza marinara, then drinks lemonade
```

The outer loop gives you each *key* of the dictionary (a category name, a string). The inner loop gives you each *dish dictionary* in that category's list. Before you use a variable, say out loud which level it is: "category is a string, dish is a dictionary".

**Category or dish?** Mixing up the levels is the usual nested-data bug: saving `category` when you meant `dish["name"]` runs without any error and gives the wrong answer.

When an AI "fixes" a red test, look at which file its diff changes. If it changed the test's expected value to match the code's output, the bug is still there and the test can't catch it any more.
