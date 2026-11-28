**From:** Maya (Tech Lead)
**Ticket:** REVIEW-403: Review Byte's apology-text PR

Your voucher tests caught both broken attempts. `late_voucher` is merged.
Byte has opened a PR that texts customers an apology when their order is late. The description says it "double-checked every function name".
AI assistants sometimes call functions that sound perfect and don't exist. Python won't complain until that exact line runs. Probably at 1 a.m. on a Friday.
Keep `app/refunds.py` open next to the PR. Check that everything it uses is really there and really does what the PR assumes. Flag only the lines with real problems.
