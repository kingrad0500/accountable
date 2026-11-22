# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

Accountable is a CRM for one salesperson, running on their own computer. It holds that person's customers: names, emails, phone numbers and what was said to them. It has no sign-in by design (see `docs/intent.md`), so the computer itself is the boundary that keeps the data private. Review with that in mind.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong: a failed request, a record deleted elsewhere, an empty table, 3,000 deals. Look hardest at the places that break quietly: "today" and time zones, money and probabilities, stage changes and their history, and the board's order after a move.
- **Data safety:** every change the user makes is saved before the app says it is, and is still there after a refresh and a restart. Deletes do exactly what the confirm dialog says, and nothing more. Nothing outside `npm run seed` and the test reset (only with `ACCOUNTABLE_TEST=1`) can wipe or overwrite the user's data.
- **Security:** no secrets are committed. The user's data never leaves their computer: the servers listen on localhost only, nothing calls an outside service, and records don't end up in logs. Database access goes through bound parameters, and user text is never rendered as HTML. Test-only routes and settings are off unless the tests turn them on.
- **Matches spec.md and plan.md:** the change does what those documents say, with nothing missing and nothing extra. That includes the rules that are easy to forget: keyboard access and visible focus (G8), contrast, and speed with the large dataset (G7). If the code is right and the document is out of date, say so; the documents are updated in the same change.
- **Tests:** the change comes with the tests that prove it, as plan.md's Proof section describes, and `npm test` passes. No test is skipped, loosened or deleted to make it pass.

## Each finding

Give the file and line, what goes wrong, and a concrete way to make it happen (the input or steps, and the wrong result). Leave out anything you can't back with a scenario like that. Bugs that were there before this change are reported in their own list, as pre-existing; they don't block the merge.

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change:

- breaks behavior that should work, or a success criterion in `docs/intent.md`;
- loses, corrupts or leaks the user's data;
- makes `npm test` fail, or weakens a test to pass;
- breaks a rule in `AGENTS.md`.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review, and none when asked to skip style.
