Run the tests and compare which ones pass and which fail. Then try `"McKenzie".capitalize()` in your head: what does `capitalize` do to the letters after the first one?
---
`capitalize()` makes the first letter a capital AND every other letter lowercase. You only want the first part. Build the name from two pieces instead: the first letter in uppercase, then the rest of the name exactly as typed.
---
Return two pieces joined with `+`: the first letter of `customer` in uppercase, then everything after the first letter, exactly as typed. Use slices for both (`[:1]` rather than `[0]`), so an empty name gives `""` instead of crashing.
