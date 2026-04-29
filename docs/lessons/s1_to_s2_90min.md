# From S1 to S2

## Key takeaways

- The repo can hand the AI context automatically.
- AGENTS.md provides global guidance read on every chat.
- Path-scoped instructions files target specific file patterns.
- Prompt files are named skills you invoke with `/`.
- The agent can read tickets through `gh` or MCP.
- Verification at S2 covers the diff and the test results.

## Activities

| # | Exercise | Artifact | Time |
|---|----------|----------|------|
| 1 | Write AGENTS.md and prove it works | AGENTS.md | 30 min |
| 2 | Wire `gh` to the agent | Live ticket read directly | 25 min |
| 3 | Add a scoped instructions file and a prompt file | Instructions file, prompt file | 25 min |

5 min intro at the top, 5 min wrap at the end.

---

## Exercise 1: Write AGENTS.md and prove it works (30 min)

Output: AGENTS.md committed to the workshop repo.

1. Run a baseline prompt without AGENTS.md. Note what it gets wrong.
2. Write AGENTS.md using the template. Commit it.
3. Re-run the same prompt with AGENTS.md in place. Compare.

---

## Exercise 2: Wire `gh` to the agent (25 min)

Output: One real ticket read directly by the agent, with an approach proposed against it.

1. Pick a pre-staged ticket from the workshop repo.
2. Prompt the agent to read it via `gh` and propose an approach. No pasted ticket text.

---

## Exercise 3: Scoped instructions + prompt file (25 min)

Output: Two committed files. One `.github/instructions/<name>.instructions.md`, one `.github/prompts/<name>.prompt.md`.

1. Author one instructions file with an `applyTo` pattern. Edit a matching file to confirm it triggers.
2. Author one prompt file. Invoke it with `/<name>` to confirm it works.

---

## Wrap (5 min)

Artifacts in the workshop repo:

1. AGENTS.md
2. `gh` integration in use
3. Instructions file
4. Prompt file

After the workshop:

- Write AGENTS.md for one real day-job repo this week.
- Use `gh issue view` instead of pasting ticket bodies.
- Capture repeated prompts as prompt files.
- Capture file-pattern rules as instructions files.

Tomorrow: Workshop 2 (S2 to S3). Spec Kit, specialist prompt files, cross-audit.

---

## Facilitator setup

Pre-flight:
- Workshop repo cloned with no AGENTS.md and 5 to 10 issues pre-staged.
- Setup email covers `gh auth login`, Copilot agent mode, and optional MCP install.
- Templates linked from the repo or the setup email.

Risks:
- `gh` not authed for everyone: fallback prompt reads the issue from a local file.
- AGENTS.md essays: cap at 50 lines.
- Exercise 3 over-runs: cut Exercise 2's MCP stretch first.
