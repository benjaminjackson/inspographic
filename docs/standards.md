## Development Standards

These standards guide our development practices. Deviations require explicit justification and discussion.

### 1. Start Simple, Build on Solid Foundations

Build in layers, starting with the simplest possible foundation. Verify it works, then add additional layers while verifying functionality at each stage. When in doubt, do the simpler thing.

### 2. Test-Driven Development

Default to TDD (red-green style) for business logic and API layers. Write failing tests first, then write code to make them pass.

**When TDD applies:** Core business logic, API endpoints, data transformations with known inputs/outputs, bug fixes (write a failing test that reproduces the bug first).

**When to skip TDD:** Exploratory programming, UI/visualization work, spike solutions. In these cases, add regression tests after the design stabilizes.

### 3. Verification Strategy

All changes require both automated tests and manual verification before merge. These are complementary:

- **Automated tests** catch regressions and document expected behavior
- **Manual verification** validates user experience and catches what automation misses

Neither alone gives 100% confidence. Final sign-off on manual verification is required before closing tickets or declaring work complete.

### 4. Granular TODO Lists

When implementing a feature, begin by creating a granular TODO list, breaking work into atomic changes. If a step can be broken down further, try. Better to have too many steps than not enough.

### 5. Error Handling & Failure Modes

Fail fast and fail clearly. Errors should be informative, not swallowed.

- **Crash vs. recover:** Crash on programmer errors (bugs). Recover gracefully from expected failures (network issues, invalid input).
- **Propagation:** Let errors bubble up to where they can be handled meaningfully. Don't catch and ignore.
- **User-facing errors:** Clear, actionable messages. No stack traces or internal details.
- **Internal errors:** Include full context (what operation, what input, what state).

### 6. Logging Standards

Logs are critical for debugging, especially for LLM-assisted development where context must be explicit.

- **What to log:** State changes, decision points, external calls, errors with full context
- **What NOT to log:** Sensitive data (tokens, passwords, PII), high-frequency noise
- **Format:** Structured logging preferred. Include timestamp, level, context, and message.
- **Levels:**
  - `error`: Something failed that shouldn't have
  - `warn`: Something unexpected but handled
  - `info`: Significant state changes, external calls
  - `debug`: Detailed execution flow (off in production)

### 7. Use Mocks Appropriately

Mocks can be brittle when testing implementation details rather than behavior.

- **Integration tests:** Prefer VCR recordings of real network requests over mocks
- **Unit tests:** Mocks are acceptable when testing behavior, not implementation
- **External services:** Always use VCR or similar for reproducibility

### 8. Dependency Management

Every dependency is a liability. Evaluate before adding.

- **Before adding:** Check maintenance status, license, bundle size, and whether you actually need it
- **Prefer:** Well-maintained, focused libraries over sprawling frameworks
- **Avoid:** Dependencies for trivial functionality you could write in 20 lines
- **Updates:** Keep dependencies current. Review changelogs before upgrading.
- **Lock files:** Always commit lock files. Never manually edit them.

### 9. Git Workflow & Branching

- **Branches:** Create feature branches from main. Use descriptive names (`feature/add-export`, `fix/login-redirect`).
- **Commits:** Atomic commits with clear messages. One logical change per commit.
- **Pull requests:** Keep PRs small and focused. Include description of what and why.
- **Merging:** Squash merge for feature branches to keep main history clean.
- **Never:** Force push to main. Commit directly to main without review.

### 10. Code Review

All code changes require review before merge. Reviews check for:
- Adherence to these standards
- Correctness and edge cases
- Clarity and maintainability

### 11. Refactoring

Refactor when:
- You're already touching the code for a feature or fix
- Complexity is blocking progress
- Tests are in place to catch regressions

Don't refactor speculatively or without test coverage.

### 12. Documentation Standards

Document what isn't obvious from the code.

- **Always document:** Public APIs, architecture decisions, setup/installation, non-obvious behavior
- **Don't document:** Self-explanatory code, implementation details that change frequently
- **Where:** READMEs for modules/services, inline comments for "why" (not "what"), ADRs for significant decisions
- **When:** Write docs with the code, not after. Stale docs are worse than no docs.

### 13. Conserve Tokens

API calls cost money. When consuming tokens, be thoughtful and deliberate. Verify functionality works at each stage before consuming more tokens.

### 14. Definition of Done

A feature or fix is done when:
- Automated tests pass
- Manual verification succeeds
- Code review approved
- Documentation updated (if applicable)
