from app.kitchen import orders_to_send
from app.order import Order


class CountingList(list):
    """A normal list that also counts every item Python looks at in it.

    `x in some_list` checks the items one by one, and so does a for loop,
    so both add to .looks. Timing with a clock is unreliable (computers vary),
    but counting the work is exact.
    """

    def __init__(self, items):
        super().__init__(items)
        self.looks = 0

    def __iter__(self):
        for item in super().__iter__():
            self.looks += 1
            yield item

    def __contains__(self, value):
        for item in self:
            if item == value:
                return True
        return False

    def __getitem__(self, index):
        self.looks += 1
        return super().__getitem__(index)


def make_orders(count):
    return [Order(1000 + n, f"customer {n}", [1250]) for n in range(1, count + 1)]


def ids(orders):
    return [order.order_id for order in orders]


def test_unsent_orders_come_back_oldest_first():
    orders = make_orders(5)  # ids 1001 to 1005
    result = orders_to_send(orders, [1002, 1004])
    assert ids(result) == [1001, 1003, 1005], (
        f"with 1002 and 1004 already sent, expected the orders [1001, 1003, 1005], got {ids(result)}"
    )


def test_nothing_new_means_nothing_to_send():
    orders = make_orders(3)
    result = orders_to_send(orders, [1003, 1001, 1002])
    assert result == [], f"every order was already sent, so expected [], got {ids(result)}"


def test_first_call_of_the_day_sends_everything():
    orders = make_orders(3)
    result = orders_to_send(orders, [])
    assert ids(result) == [1001, 1002, 1003], f"nothing was sent yet, so expected every order, got {ids(result)}"


def test_lists_are_not_changed():
    orders = make_orders(3)
    sent_ids = [1001]
    orders_to_send(orders, sent_ids)
    assert ids(orders) == [1001, 1002, 1003], f"orders_to_send must not change the orders list, got {ids(orders)}"
    assert sent_ids == [1001], f"orders_to_send must not change sent_ids, got {sent_ids}"


def test_lunch_rush_is_fast_enough():
    orders = make_orders(600)  # ids 1001 to 1600
    sent_ids = CountingList(ids(orders)[:550])  # the first 550 were already sent
    result = orders_to_send(orders, sent_ids)
    assert ids(result) == list(range(1551, 1601)), "expected the last 50 orders (1551 to 1600) to be sent"
    limit = 2 * (len(orders) + len(sent_ids))
    assert sent_ids.looks <= limit, (
        f"To check {len(orders)} orders against {len(sent_ids)} sent ids, orders_to_send looked at "
        f"{sent_ids.looks:,} items of sent_ids. That's re-reading the list for almost every order! "
        f"It should take at most {limit:,} looks: read sent_ids once, in a form that's instant to check."
    )
