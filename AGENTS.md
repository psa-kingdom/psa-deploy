# AGENTS.md

## PURPOSE

This file contains the compact engineering rules that AI coding agents must repeatedly know while working on this repository.

It is intentionally concise.

Do not turn this file into a project history or encyclopedia.

---

## SOURCE OF TRUTH

When documentation conflicts with implementation:

1. Verified implementation
2. Verified tests / observable behavior
3. Recent confirmed architectural decisions
4. Current project documentation
5. Older documentation
6. AI assumptions

Flag contradictions instead of silently choosing one.

---

## ARCHITECTURE RULES

Before modifying a meaningful feature:

- Understand its existing architecture.
- Identify its feature boundary.
- Identify dependencies.
- Avoid unrelated modifications.
- Preserve existing behavior unless explicitly changing it.
- Reuse existing abstractions where appropriate.
- Do not duplicate business logic.
- Do not create unnecessary abstractions.

---

## CHANGE SCOPE

For every task:

1. Understand the requested outcome.
2. Identify affected files/modules.
3. Identify files that should remain untouched.
4. Make the smallest safe change.
5. Verify the result.
6. Check for regressions.
7. Update relevant documentation only when necessary.

---

## REFACTORING

Refactor when duplication or architectural problems are directly introduced or clearly exposed by the current change.

Do not perform unrelated cleanup during a surgical task.

---

## TESTING

Use the verification method appropriate to the change.

UI/UX:
- browser verification where meaningful

Backend:
- tests
- API verification
- type/validation checks

Configuration:
- build/deployment validation where appropriate

Do not perform expensive verification rituals that provide no useful evidence.

---

## DOCUMENTATION

Documentation must remain useful and concise.

Update only documentation affected by meaningful changes.

Never create documentation merely to satisfy a checklist.

---

## SECURITY

Never expose:

- secrets
- credentials
- tokens
- private keys

Validate user input.

Preserve existing authentication and authorization boundaries.

---

## COMPLETION

A meaningful implementation is not complete until:

- implementation works
- relevant tests/verification pass
- no obvious regression is introduced
- architecture remains coherent
- relevant documentation is reconciled

---

## AI AGENT BEHAVIOR

Do not guess when uncertainty can materially affect the result.

Ask for clarification when:

- requirements conflict
- architecture is unclear
- a destructive action is required
- security could be affected
- production behavior could be affected

Otherwise proceed efficiently.
