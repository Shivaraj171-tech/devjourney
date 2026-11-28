**From:** Maya (Tech Lead)
**Ticket:** LAB-103: Grabby tried to fold itself in half

Rosa is not happy.
A box landed right next to Grabby's base. Instead of saying "can't reach that", `plan_reach` crashed with a math domain error. Ten minutes later it planned a pose with the elbow bent to 147°, and the forearm hit the upper arm.
Every plan must respect the arm's ring of reach AND both joint limits, and say `None` when a box is impossible. Fix `grabby/limits.py`. The Lab viewer shades every spot Grabby can really reach and marks each box it accepts or refuses.
