Compare the two plots in the Lab viewer: what really happened, and what the model predicts for the same grasps. Then read `FEATURES`, and the docstring at the top of `grabby/grasp_data.py`: which reading only exists after Grabby has already tried?
---
`slipped` is recorded DURING the lift, so on the logbook it almost equals "the grasp failed". The model leans on it and gets 97%. Before a new grasp there's no slip reading (it's None, counted as 0, which looks like "no slip"), so it predicts success for nearly everything.
---
The fix is in the list of features the model is allowed to look at. Keep only what is known before the grasp. Which entry of `FEATURES` has to go?
