**From:** Maya (Tech Lead)
**Ticket:** REVIEW-403: Review Byte's apology-text PR

Your voucher tests caught both of Byte's broken attempts, so `late_voucher` is merged and safe. 🎉
Now Byte has opened a PR that texts customers an apology when their order is late, and its description says it "double-checked every function name".
AI assistants sometimes call functions that sound perfect but don't exist, and Python won't complain until that exact line runs, maybe at 1 a.m. on a Friday.
Keep `app/refunds.py` open next to the PR and check that everything it uses is really there and really does what the PR assumes. Flag only the lines with real problems.
