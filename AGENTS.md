
# Coding Agent Instructions

## Scope
- Implement only the feature explicitly requested.
- Inspect the smallest relevant set of files.
- Do not scan the entire repository by default.
- Search for additional files only when necessary to resolve dependencies.
- Do not read package-lock.json, generated files, build output,
  or dependency folders unless specifically required.

## File Changes
- Modify only files required for the requested feature.
- Do not refactor unrelated code.
- Do not create new files if an existing file can reasonably be updated.
- Do not change package versions or add dependencies without approval.
- Preserve existing architecture and coding conventions.
- Question banks live in `src/questions/*.json` and are discovered at build time.
  Each bank has a `title` and `questions` array. Each question has `ques` and
  `explanation` strings, an `options` array of `{ "id": string, "text": string }`,
  and `ans`, an array of correct option IDs. The number of IDs in `ans` sets the
  allowed selection count and each correct selection earns one point. Keep option
  IDs unique within a question; every `ans` ID must match an option. Question,
  option, and explanation strings may contain trusted HTML.

## Verification
- Do not write tests unless explicitly requested
- Run only the tests and checks relevant to the change.
- Do not run full builds or test suites unless necessary or requested.
- Do not repeat a successful check unless code changes affect it.

## Response
- Summarize files changed and why.
- Report commands executed and their results.
- Keep explanations concise.
- If broader changes are required, explain why before proceeding.
