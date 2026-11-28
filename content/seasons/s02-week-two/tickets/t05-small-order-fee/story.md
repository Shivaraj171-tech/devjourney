**From:** Maya (Tech Lead)
**Ticket:** REVIEW-205: Review the small-order fee PR

Last ticket of the week. Tiny orders cost us more to deliver than we earn on them, so orders under $10.00 now pay a $1.50 fee. Byte has opened the PR.
This one is *mostly* good. I skimmed it and found nothing. Something about it still bothers me.
This PR changes existing files, so read what changed (the lines marked **+**), not only the new function. Then check each change against its docstring.
If it's all fine except one thing, flag that one thing. A reviewer who flags everything is as useless as one who flags nothing.
