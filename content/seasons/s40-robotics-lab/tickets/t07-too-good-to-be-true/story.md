**From:** Maya (Tech Lead)
**Ticket:** LAB-107: 97% accurate in the notebook, a coin flip on the line

Byte trained a model to predict whether a grasp will work before Grabby tries it (`grabby/grasp_model.py`), so the arm can skip the hopeless ones. On last month's logbook it scored 97%.
On the packing line it's right about half the time. It says "success" for almost every box, and the drops pile up. Rosa says the logbook has one column the line can't have yet.
Find out why the model is great on paper and useless on the line, and fix it. The Lab viewer plots tomorrow's grasps twice: what really happened, and what the model predicts.
