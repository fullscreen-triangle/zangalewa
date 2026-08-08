# vaHera DSL — Grammar Reference

vaHera is a **line-oriented** language: one statement per line, parsed top to bottom.
Blank lines are ignored. A line beginning with `#` is a comment, **except** `# aspect: NAME`
which registers a retrieval aspect. Whitespace around tokens is trimmed. Every statement
must match one of the 15 forms below **exactly** — an unrecognized line is a hard error
(`line N: unknown vaHera: ...`). Quoted strings use double quotes.

## The 15 statement forms

### 1. describe
```
describe TARGET with "TEXT"
```
Attach descriptive text to a target symbol. `TARGET` is a bare identifier (no spaces).
Example: `describe SOD1 with "superoxide dismutase 1"`

### 2. resolve
```
resolve TARGET
```
Resolve a described target to a coordinate/embedding.
Example: `resolve SOD1`

### 3. spawn
```
spawn PROGRAM from TARGET
```
Spawn a process `PROGRAM` from a resolved `TARGET`. Both are bare identifiers.
Example: `spawn analysis from SOD1`

### 4. navigate
```
navigate to penultimate
```
Fixed phrase, no arguments. Navigate the active process to its penultimate state.

### 5. complete
```
complete trajectory
```
Fixed phrase, no arguments. Complete the active trajectory.

### 6. memory create
```
memory create at S(K, T, E)
```
Create a memory anchor at the S-entropy coordinate `S(k, t, e)` where k, t, e are
numbers (integers, decimals, or scientific notation). The `S(...)` form is required.
Example: `memory create at S(0.2, 1.0, -0.5)`

### 7. memory store
```
memory store "NAME" = "TEXT"
```
Store a named memory with text content. Both NAME and TEXT are double-quoted.
Example: `memory store "greeting" = "hello world"`

### 8. memory find
```
memory find nearest "QUERY"
memory find nearest "QUERY" k=N
```
Find the nearest stored memories to QUERY. Optional `k=N` sets how many to return
(default 3). N is an integer.
Example: `memory find nearest "greeting" k=5`

### 9. memory list
```
memory list
```
Fixed phrase, no arguments. List all stored memories.

### 10. memory dump
```
memory dump NAME
```
Dump the full content of a named memory. `NAME` is a bare identifier (no quotes).
Example: `memory dump greeting`

### 11. demon sort
```
demon sort
```
Fixed phrase, no arguments. Run the Maxwell-demon categorical sort.

### 12. controller verify
```
controller verify
```
Fixed phrase, no arguments. Verify the controller invariant.

### 13. kernel stats
```
kernel stats
```
Fixed phrase, no arguments. Report kernel statistics.

### 14. kernel trace
```
kernel trace
```
Fixed phrase, no arguments. Report the kernel event trace.

### 15. process list
```
process list
```
Fixed phrase, no arguments. List active processes.

## Aspects (comment directive)

```
# aspect: NAME
```
Registers a retrieval aspect used to bias later `memory find` / `resolve` operations.
Ordinary comments (`# ...`) are ignored.

## Worked scripts

### Store-and-retrieve
```
memory store "x" = "1"
memory store "y" = "2"
memory find nearest "x" k=2
memory list
```

### Describe, resolve, spawn a trajectory
```
describe SOD1 with "superoxide dismutase 1"
resolve SOD1
spawn analysis from SOD1
navigate to penultimate
complete trajectory
```

### Anchor a coordinate then inspect the kernel
```
memory create at S(0.2, 1.0, -0.5)
demon sort
kernel stats
kernel trace
```

## Generation rules (for producing valid vaHera)

- Emit **one statement per line**; never combine statements on one line.
- Fixed-phrase statements (navigate, complete, memory list, demon sort, controller
  verify, kernel stats, kernel trace, process list) must be written verbatim.
- Double-quote all string arguments; do not quote bare identifiers (targets, program
  names, `memory dump NAME`).
- `memory create at` requires the literal `S(k, t, e)` coordinate form.
- Do not invent statement forms — only the 15 above are valid; anything else is a
  parse error.
