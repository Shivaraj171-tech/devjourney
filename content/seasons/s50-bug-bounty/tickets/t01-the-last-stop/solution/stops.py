def stops_left(route, current):
    """The stops after position `current` in `route`, up to and including the last stop."""
    left = []
    for i in range(current + 1, len(route)):
        left.append(route[i])
    return left
