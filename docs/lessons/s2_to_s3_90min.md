# From S2 to S3

## Key takeaways

- Spec Kit drives multi-step changes from a written spec, plan, and tasks.
- A `constitution.md` captures non-negotiables that every plan is checked against.
- Specialist prompt files give different roles different system prompts.
- Cross-audit uses different reviewers on the same diff.
- Different rubrics catch different issues.

## Activities

| # | Exercise | Artifact | Time |
|---|----------|----------|------|
| 1 | Drive a small change end to end with Spec Kit | `spec.md`, `plan.md`, `tasks.md`, implementation diff | 30 min |
| 2 | Author two specialist prompt files and dispatch them | `test-writer.prompt.md`, `reviewer.prompt.md` | 25 min |
| 3 | Open a PR and compare review rubrics | One PR with multi-rubric review | 25 min |

5 min intro at the top, 5 min wrap at the end.

---

## Exercise 1: Drive a small change with Spec Kit (30 min)

Output: `spec.md`, `plan.md`, `tasks.md`, and an implementation diff produced by Spec Kit.

1. Pick a pre-staged change candidate from the workshop repo.
2. Run `/speckit.specify`, `/speckit.plan`, and `/speckit.tasks` in sequence. Review and edit each output. Confirm the plan is checked against `constitution.md`.
3. Run `/speckit.implement` to generate the implementation diff.

---

## Exercise 2: Author two specialist prompt files (25 min)

Output: `test-writer.prompt.md` and `reviewer.prompt.md` committed, plus a diff with tests added and review feedback captured.

1. Author `test-writer.prompt.md` from the template. Dispatch it on the implementation diff. Tests added.
2. Author `reviewer.prompt.md` from the template. Dispatch it in a fresh chat on the now-complete diff. Capture the review feedback.

---

## Exercise 3: PR and cross-audit (25 min)

Output: One PR with review feedback from two different rubrics.

1. Open a PR with the implementation and tests.
2. Wait for Copilot Code Review to run on the PR.
3. Compare findings: what `reviewer.prompt.md` flagged earlier vs what Copilot Code Review flagged on the PR.

---

## Wrap (5 min)

Artifacts in the workshop repo:

1. `constitution.md`
2. `specs/<change>/spec.md`, `plan.md`, `tasks.md`
3. Implementation diff from `/speckit.implement`
4. `test-writer.prompt.md`
5. `reviewer.prompt.md`
6. PR with multi-rubric review

After the workshop:

- Run Spec Kit on the next non-trivial ticket in a real day-job repo.
- Share the specialist prompt files with your team.
- Turn on Copilot Code Review for one real day-job repo.

---

## Facilitator setup

Pre-flight:
- Workshop repo carried over from Workshop 1 with all W1 artifacts in place.
- `constitution.md` committed at the repo root with 3 to 5 non-negotiables.
- 5 small change candidates pre-staged as issues.
- Setup email covers Spec Kit install (`uvx specify`) and confirms Copilot Code Review is enabled on the repo.
- Specialist prompt file templates linked.

Risks:
- `/speckit.*` commands not recognized: smoke test in setup email.
- Copilot Code Review not enabled: verify with a dummy PR before the session.
- Specialist prompts come out nearly identical: templates must enforce clear role separation.
- `/speckit.implement` produces broken or partial code: that is fine. The reviewer should catch real issues.
