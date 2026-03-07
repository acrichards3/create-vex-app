## Testing

Use Bun's built-in test runner exclusively. Do not install Jest, Vitest, or any other test framework. Import everything from `bun:test`.

### Test File Location

Co-locate test files next to the source file they test.

```
features/
  users/
    users.controller.ts
    users.controller.test.ts
    users.action.ts
    users.action.test.ts
    users.service.ts
    users.service.test.ts
```

### Test Structure

Use `describe` / `it` (not `test`). Structure tests as a decision tree that mirrors the code paths:

1. **Top-level `describe`** — the function or endpoint being tested
2. **`describe("WHEN ...")`** — a condition or input scenario
3. **`describe("AND ...")`** — a deeper branch when paths diverge further
4. **`it("does X")`** — the leaf assertion, only at the end of a path

Continue nesting `AND` blocks until all code paths are covered.

```typescript
describe("/verify", () => {
  describe("WHEN there is no body", () => {
    it("throws a 400", () => {});
  });

  describe("WHEN there is a body", () => {
    describe("AND the body does NOT contain a code AND pin", () => {
      it("throws a 400", () => {});
    });

    describe("AND it DOES contain a code and pin", () => {
      describe("AND the code or pin is INVALID", () => {
        it("throws a 401", () => {});
      });

      describe("AND the code and pin are both VALID", () => {
        it("returns a 200 with the assignedTo", () => {});
      });
    });
  });
});
```

### Setup and Teardown

- All test setup goes in `beforeEach` blocks — not inside `it` blocks
- `it` blocks should only run the action being tested and assert the result
- Teardown/cleanup goes in `afterEach` blocks

### Mocking

Test real behavior. Do not mock your own code just to make tests pass — if you can run it, run it for real.

Mocks are only acceptable when:

- The dependency is an external API or third-party service you cannot control
- The real thing has side effects that cannot run in tests (sending emails, processing payments)
- You need to simulate a specific failure condition (network timeout, DB connection refused)

Never mock a function and then assert that the mock returned what you told it to return. That tests nothing.
