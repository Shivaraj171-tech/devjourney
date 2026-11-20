def busiest_hour(counts):
    """counts is a list of (hour, orders) pairs. Returns the hour with the most orders."""
    best_hour, best = None, -1
    for hour, orders in counts:
        if orders > best:
            best_hour, best = hour, orders
    return best_hour
