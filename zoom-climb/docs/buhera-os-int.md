# Using the Interceptor Framework Inside Buhera OS

**How to install, run, and use `zangalewa` (the Minimum Sufficient Interceptor)
and `desk` (the blank surface / tagged intent) inside the running Buhera
operating system.**

This is an operational guide, not a theory paper. Every command here works
against the shipped code in `long-grass/`. Where a piece is already built and
running, this doc says so plainly; where you have to do something, it gives the
exact command or edit.

---

## 0. TL;DR — is anything to install?

**No installation step. The framework is already part of the OS.**

Buhera OS *is* the Next.js app in `long-grass/`. The interceptor framework is
two modules registered in that app's federation:

| Module | Role | Status |
|--------|------|--------|
| `zangalewa` | Interceptor — natural language → S-coord + research card | **already registered and running** |
| `desk` | Meta / context — holds the standing intent, scores each act's contribution toward it | **already registered and running** |

Both appear in `:modules` the moment the OS boots. "Using the framework"
means dispatching to these two modules from the terminal — nothing is bundled,
pip-installed, or linked separately. Opening the running OS *is* having the
framework installed.

The rest of this document explains how to **run the OS** (§1), how to **use
the framework once it is running** (§2–§4), and — for the one thing that is
*not* yet built — how the interceptor could become the OS's standing front door
(§6, optional).

---

## 1. Running the OS

The framework runs wherever the OS runs. There are three ways to run it.

### 1.1 Use the live deployment (zero install)

Open [long-grass.vercel.app](https://long-grass.vercel.app). The terminal is
the OS. Type into it. `zangalewa` and `desk` are already there. This is the
"no install" path — the deployed URL is the installed OS.

To use the LLM-backed part of the framework (`zangalewa` calls a model), the
deployment must have at least one provider key set. Check with:

```
https://long-grass.vercel.app/api/providers
```

If `available` is non-empty, `zangalewa` works. If it is empty, `zangalewa`
returns a clear "no provider configured" — `desk` still works fully (it needs
no LLM).

### 1.2 Run it locally

```
cd long-grass
npm install
npm run dev
```

Open `localhost:3000`. Same terminal, same federation, same two modules.

For `zangalewa` locally, put a provider key in `long-grass/.env.local`:

```
# any ONE of these is enough; the cascade tries Ollama → Gemini → HF → OpenAI
OLLAMA_URL=http://localhost:11434
GEMINI_API_KEY=...
HUGGINGFACE_API_KEY=...
OPENAI_API_KEY=...
```

Restart `npm run dev` after editing `.env.local`. `desk` needs no key.

### 1.3 Build it for production

```
cd long-grass
npm run build      # must pass with no errors
npm start          # or deploy to Vercel
```

`next build` compiling cleanly is the proof the framework is correctly wired
into the OS. Both `zangalewa` and `desk` are included in that build today.

---

## 2. Confirming the framework is present

Boot the OS (any of §1) and, in the terminal:

```
:modules
```

You should see `zangalewa` and `desk` in the federation list alongside
`vahera`, `lavoisier`, `graffiti`, `purpose`, `purpose-carry`, and the rest.
If both are listed, the framework is installed and live. That is the whole
"installation check."

---

## 3. Using `zangalewa` — the interceptor

`zangalewa` is the Minimum Sufficient Interceptor: one natural-language
utterance in, one S-coordinate plus a rendered research card out. It is the
OS's translator from human intent to a structured, routable result.

### 3.1 The single-call form

```
dispatch("zangalewa", "what is p53?")
```

Returns a card with a title, an S-coordinate `(S_k, S_t, S_e)`, sections,
references, and which provider answered. This is the atomic use — the OS
intercepting one question.

### 3.2 From a turbulance (kwasa-kwasa) script

Because `zangalewa` is a federation module, any orchestration script can call
it and pass its result onward — this is what "using it together with the rest
of the OS" means at the script level:

```
item z = dispatch("zangalewa", "how does CRISPR-Cas9 repair a double-strand break")
print(z.output_delta.title)
print(z.output_delta.coord.S_e)
```

The result is an ordinary value; feed `z.output_delta.coord` (the coordinate,
not the content) to any other module. That coordinate-only hand-off is the
interceptor discipline: the next module receives *where* the answer sits, not a
blob of prose.

### 3.3 Requirements and failure modes

- Needs a provider key (§1.1). With none set, it returns
  `ok:false` with a "no provider configured" line — a clean failure, not a
  crash.
- Has no memory between calls. Each dispatch is independent. If you need a
  standing reason to persist across calls, that is `desk`'s job (§4).

---

## 4. Using `desk` — the blank surface / tagged intent

`desk` is the one component the human actually talks to when using the OS as a
whole: it holds the **reason** the work is being done — the standing intent —
and scores every subsequent act for how much it contributes toward that reason.
It needs no LLM and no network; it is pure federation bookkeeping.

### 4.1 Tag the reason once

```
dispatch("desk", "map the PC lipidome shift under heat stress")
```

This sets the standing intent (the global goal). Every act dispatched *after*
this — to any module — is now scored for its contribution toward this reason.

### 4.2 Do work through the federation as usual

```
dispatch("lavoisier", "demo")                                -- on-topic
dispatch("vahera", "memory find nearest \"lipidome shift\"") -- on-topic
memory store "shopping" = "buy milk from the corner shop"    -- off-topic
```

You do not tell `desk` about these — the OS feeds every act to it
automatically (via the same post-dispatch hook the OS uses for `purpose-carry`).

### 4.3 Surface: see what was necessary vs. merely correct

```
dispatch("desk", { kind: "surface" })
```

Returns the tagged reason, its term-coverage, and the acts split into:

- **necessary** — contributed toward the reason (δS > 0), ranked most-first;
- **purposeless** — correct but off-reason (δS = 0), e.g. the shopping note.

This is the OS telling you which of your steps actually advanced the reason and
which were merely valid. The reason outlives every individual script.

### 4.4 Other `desk` instructions

```
dispatch("desk", { kind: "stats" })   -- tagged?, term count, acts seen, necessary/purposeless counts
dispatch("desk", { kind: "clear" })   -- drop the intent, blank the surface
```

Re-tagging with a new reason starts a fresh intent — a new goal, prior
observations discarded.

---

## 5. Using the two together (the intended workflow)

The framework is at its most useful when `desk` holds the reason and
`zangalewa` intercepts questions against it, mixed freely with the domain
modules. A worked session:

```
-- 1. Tell the OS why you are here.
dispatch("desk", "compare heat-stress lipidome shift against a control run")

-- 2. Intercept a background question.
item z = dispatch("zangalewa", "what is a phosphatidylcholine")

-- 3. Do the actual domain work.
item ms = dispatch("lavoisier", "demo")

-- 4. Ask the OS what mattered toward the reason.
dispatch("desk", { kind: "surface" })
```

`zangalewa` translates human questions into structured coordinates; the domain
modules do the work; `desk` holds the standing reason and reports which acts
were necessary. None of the modules know about each other — they compose
through `dispatch()` and the audit log alone. That is the federation working as
one OS.

Check the trail at any point:

```
:audit
```

Every act — zangalewa, lavoisier, vahera, and your desk tags — appears with its
own act id. That committed history is the substrate `desk` scores against.

---

## 6. (Optional, not yet built) The interceptor as the OS's front door

Everything above uses `zangalewa` by **explicit dispatch** —
`dispatch("zangalewa", "...")`. Today the terminal routes raw input by keyword:
turbulance keywords open a script, vaHera keywords run a memory statement, SCOPE
prefixes go to SCOPE, and so on (see `routeInput()` in
`src/components/BuheraTerminal.js`). Plain, unrecognised natural language is
**not** yet auto-routed to the interceptor.

Making `zangalewa` the *standing front door* — so any plain sentence is
intercepted, held against the desk's tagged reason, and routed to whichever
module's DSL should handle it — is a real, separate piece of work. It is **not
required** to use the framework (§2–§5 all work now); it is the next step if you
want the OS to accept bare intent with no `dispatch(...)` ceremony.

If you want that, it is one localised change: add a final fall-through case in
`routeInput()` that sends unrecognised input to `zangalewa` (consulting `desk`
for the standing intent). Say the word and it can be built against the routing
seam that already exists — nothing else in the federation has to change.

---

## 7. Quick reference

| I want to… | Command |
|------------|---------|
| Run the OS locally | `cd long-grass && npm install && npm run dev` |
| Check the framework is present | `:modules` (look for `zangalewa`, `desk`) |
| Check LLM providers | open `/api/providers` |
| Intercept one question | `dispatch("zangalewa", "your question")` |
| Set the standing reason | `dispatch("desk", "why you are working")` |
| See what was necessary | `dispatch("desk", { kind: "surface" })` |
| Reset the reason | `dispatch("desk", { kind: "clear" })` |
| See the act history | `:audit` |

---

*Both modules ship in `long-grass/` today. `zangalewa` is
`src/lib/modules/zangalewa-module.js` (+ the `/api/extract` route); `desk` is
`src/lib/modules/desk-module.js`. Both are registered in the mount effect of
`src/components/BuheraTerminal.js`. Using the framework is dispatching to them;
there is nothing else to install.*
