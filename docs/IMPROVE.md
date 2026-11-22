# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Look at what went wrong on this change: the review's findings, what the person corrected and what the checks and hooks caught (including failures that turned out to be the harness, not the code).
2. Compare with earlier rounds to find repeats: the `Deploy: review fixes` and `Harness:` commits (`git log --oneline`, then `git show <commit>`) and their entries in `docs/STATUS.md`. A repeat is the same kind of mistake, not the same line of code.
3. For a mistake that has happened twice, prefer a check a tool runs (a test, a lint rule, a script) over a written rule. Only when no tool can catch it, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. A new check must pass before you add it: if it finds real bugs, fix them in the same round and say so.
4. Remove anything out of date.
5. Record the round in `docs/STATUS.md`: each repeat, what now catches it, and anything the new checks found.
6. Improve this file, so that the next round makes a better change. Keep this as the last step.
