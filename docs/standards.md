## Development Standards: Constitution

These standards must be followed to the letter during any software development tasks.

### Article 0. Conserve Tokens

Tokens are expensive. Running scripts with `*_API_KEY` consumes them. When consuming tokens, be thoughtful and deliberate, verifying functionality works at each stage before consuming an increasing number of tokens.

### Article I. Test-Driven Development

ALWAYS write code using test-driven development in the red-green style. Write failing tests first, then write the code to make them pass.

### Article II. Granular TODO Lists

When implementing a feature, begin by creating the most granular TODO list possible, breaking down the work into atomic changes. Lean into this; if a step can be broken down further, you should try. Better to have too many steps than not enough.

### Article III. Start simple, build on solid foundations.

Build in layers, starting with the simplest possible foundation, verifying it works, then adding additional "simplest possible" layers while verifying functionality at each stage.

### Article IV. Manual Verification.

You will not declare a feature as complete until you have verified it manually. Automated tests can be misleading. Manual testing is the only way to verify functionality 100%.

### Article V. Use Mocks Sparingly.

Mocks are brittle and can provide a false sense of security. Whenever possible, use VCR recordings of real network requests for integration tests and any other tests that would need to hit the network.