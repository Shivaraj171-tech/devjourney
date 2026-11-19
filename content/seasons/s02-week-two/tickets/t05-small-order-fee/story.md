**From:** Maya (Tech Lead)
**Ticket:** REVIEW-205: Review the small-order fee PR

Last ticket of the week! Tiny orders cost us more to deliver than we earn, so we're adding a $1.50 fee for orders under $10.00. Byte has opened the PR.
To be fair to Byte, it's learning: this PR is honestly *mostly* good. I've skimmed it and couldn't spot anything, but my gut says something's off.
This time the PR changes existing files, so look at what changed (the lines marked **+**), not just at the new function. Then check each change against its docstring.
If it's all fine except one thing, flag just that one thing. A reviewer who flags everything is as unhelpful as one who flags nothing.
