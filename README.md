# Zangalewa

<p align="center">
  <img src="zangalewa.png" width="400" alt="Zangalewa">
</p>

<p align="center"><em>"I take responsibility for my actions"</em></p>

<p align="center">
  <strong>A research project on categorical intent navigation<br>
  and the operating-system boundary.</strong>
</p>

---

## Abstract

Zangalewa is a research project on replacing forward-navigation human–computer interaction with backward trajectory completion in S-entropy space. Its theoretical core is a categorical operating system &mdash; *Buhera* &mdash; in which observation, computation, and physical processing are proved identical under a single operation, categorical address resolution in a ternary partition hierarchy, and in which the human surface reduces to a single blank screen. Three extension papers formalise the minimum sufficient interceptor that sits at the operating-system boundary, the hierarchical specialist cascade that scales routing sub-linearly in the number of domains, and the blank-screen presentation paradigm that is forced, not chosen, by the substrate's invariants. A proof-of-principle demonstration (`zoom-climb/`) implements the interceptor surface in TypeScript + WebGPU, routing natural-language utterances to domain-specific render-leaves lifted from prior research tools. The present repository is the research record; the long-term Rust-based substrate implementation is in progress.

## Contents

1. [Motivation](#1-motivation)
2. [Theoretical foundation](#2-theoretical-foundation)
3. [The demonstration: `zoom-climb`](#3-the-demonstration-zoom-climb)
4. [Repository layout](#4-repository-layout)
5. [Status](#5-status)
6. [Author](#6-author)
7. [License](#7-license)

---

## 1. Motivation

Conventional operating systems organise human&ndash;computer interaction around *forward* navigation: the user knows where they are and specifies, step by step, how to reach where they want to be. For general interactive computing this is natural. For scientific research it is inverted &mdash; the researcher knows the desired outcome (an observation, a value, a completed analysis) and needs the system to discover the computational path. Forward navigation imposes a cognitive overhead, bounded below by Fitts's and Hick's laws at roughly 2.7&ndash;5.7&#8239;s per task, that accumulates across every view change, file lookup, and application switch.

Zangalewa develops an alternative. The framework rests on an identity &mdash; observation, computation, and physical processing are the same operation, formally *categorical address resolution* in a bounded partition space &mdash; and on the complexity separation this identity affords: for categorically entailed problems, backward navigation from the desired final state reaches the penultimate state in *O*(log<sub>3</sub>&#8239;*N*) ternary decisions, after which a single completion morphism produces the answer. The user interface that remains, once the forward-navigation machinery is eliminated, is a single blank surface: cursor, utterance, rendered artefact. The theoretical work shows that this surface is not a design choice but a consequence of the substrate's invariants.

## 2. Theoretical foundation

The intellectual content of the project is distributed across two groups of manuscripts, all under [`zoom-climb/docs/`](zoom-climb/docs/).

### 2.1 The substrate: Buhera categorical operating system

Six manuscripts, under [`zoom-climb/docs/sources/`](zoom-climb/docs/sources/), develop the categorical operating system on which the interceptor framework sits.

- **`trajectory-completion.tex`** &mdash; the Triple Equivalence theorem (*S* = *k*<sub>B</sub>&#8239;*M*&#8239;ln&#8239;*n* under oscillator, categorical, and partition descriptions simultaneously), the Fundamental Identity &Oscr;(*x*) &equiv; &Cscr;(*x*) &equiv; &Pscr;(*x*), the penultimate state formalism, and the zero-cost sorting theorem. Validated with sixteen Earth&ndash;Moon system properties derived from partition geometry alone.
- **`backward-navigation.tex`** &mdash; proves that backward trajectory completion through a discrete ternary partition requires a continuous metric embedding, and that S-entropy is the unique such embedding up to isometry.
- **`buhera-operating-system.tex`** and **`buhera-os-architecture.tex`** &mdash; the operating-system specification: five microkernel subsystems (Categorical Memory Manager, Penultimate State Scheduler, Demon I/O Controller, Proof Validation Engine, Triple Equivalence Monitor), entropy-addressed memory, penultimate-state scheduling, zero-cost demon operations, continuous proof validation.
- **`vaHera-categorical-scripting.tex`** &mdash; the kernel's internal declarative language, whose statements specify final states rather than instruction sequences.
- **`blank-screen-integration.tex`** &mdash; the integration paper: four-layer stack, empty-dictionary storage, the epistemic externality of the substrate, cross-domain geometric transfer as a structural consequence rather than an engineered feature.

### 2.2 The boundary: the LLM interceptor

The operating system requires a boundary layer that converts human natural-language utterances into S-coordinates the kernel can act on. The original interceptor paper at [`zoom-climb/docs/zangalewa-os-llm-interceptor.pdf`](zoom-climb/docs/zangalewa-os-llm-interceptor.pdf) establishes the four-component decomposition: molecular intent encoding, categorical navigation, precision-by-difference memory, and Maxwell-demon resource placement.

Three extension papers, under [`zoom-climb/docs/publications/`](zoom-climb/docs/publications/), characterise this boundary formally and independently.

- **[`sufficient-interceptor/`](zoom-climb/docs/publications/sufficient-interceptor/)** &mdash; *The Minimum Sufficient Interceptor.* Proves that coordinate extraction from an utterance requires capacity &Omega;(*D*&#8239;log&#8239;|&Sigma;|), independent of the size of the downstream world; formalises session-trajectory maintenance via precision-by-difference and a four-state focus-arbitration machine.
- **[`hierarchical-specialist-cascades/`](zoom-climb/docs/publications/hierarchical-specialist-cascades/)** &mdash; *Hierarchical Navigation Cascades.* Establishes *O*(log<sub>*k*</sub>&#8239;*N*) routing complexity, additive (not multiplicative) multi-scale latency, and failure-localisation for cascaded specialist ensembles.
- **[`blank-screen-paradigm/`](zoom-climb/docs/publications/blank-screen-paradigm/)** &mdash; *The Blank-Screen Paradigm.* Derives, from the observation&ndash;computation identity, a no-RPC theorem for inter-layer composition and a file-operation symmetry theorem under which saving and retrieving are a single primitive differentiated by a sign; formalises scientific research as the canonical observation-first workload.

Each extension paper is accompanied by a validation programme ([`validation/`](zoom-climb/docs/publications/validation/)) producing JSON-backed empirical measurements and five data-driven figure panels with captions.

## 3. The demonstration: `zoom-climb`

[`zoom-climb/`](zoom-climb/) is a proof-of-principle implementation of the interceptor surface. Its purpose is to demonstrate that the blank-screen paradigm yields a coherent human interaction model; it is *not* a production system, and it does not implement the Buhera kernel. The intent extractor is currently a deterministic keyword matcher at [`zoom-climb/src/pages/api/extract.ts`](zoom-climb/src/pages/api/extract.ts); the render-leaves are stubs that echo their dispatched payload. OpenAI-backed coordinate extraction and render primitives lifted from prior research tools will replace these stubs incrementally.

### 3.1 Pages

The demonstration exposes a landing page and three entry points onto a single blank surface:

- **`/`** &mdash; landing page describing the paradigm and linking to the three on-ramps.
- **`/hieronymus`** &mdash; microscopy-flavoured entry (placeholder hint: *"cortical neurons at 40&times; fluorescence"*).
- **`/honjo`** &mdash; cheminformatics-flavoured entry (*"caffeine binding affinity to adenosine A2a"*).
- **`/shakespear`** &mdash; instrument-flavoured entry (*"70&#8239;eV electron-impact mass spectrum of ethanol"*).

The three demo pages mount the same `<BlankSurface />` component with the same full render-leaf registry. The URL flavours only the placeholder hint; a cross-domain utterance on any page composes multiple leaves on the same surface. This is the architectural claim of the blank-screen paper made concrete: the three pages are pedagogical on-ramps, not separate tools.

### 3.2 State machine

The surface is formally a reducer over four states &mdash; `blank`, `thinking`, `rendered`, `error` &mdash; defined in [`zoom-climb/src/components/blank-surface/state-machine.ts`](zoom-climb/src/components/blank-surface/state-machine.ts). Any enrichment of the surface that does not fit this machine is architectural regression, not interface improvement.

### 3.3 Running locally

```bash
cd zoom-climb
npm install
npm run dev
```

The application serves at `http://localhost:3000`.

## 4. Repository layout

```
zangalewa/
├── zangalewa.png                                    logo
├── README.md                                        this file
├── LICENSE                                          MIT
│
├── zoom-climb/                                      demonstration (TypeScript + WebGPU)
│   ├── src/
│   │   ├── pages/                                   landing + 3 demo pages + API route
│   │   ├── components/blank-surface/                the single-surface reducer
│   │   └── components/render-leaves/                dispatch registry + 3 stub leaves
│   └── docs/
│       ├── zangalewa-os-llm-interceptor.pdf         original interceptor paper
│       ├── publications/
│       │   ├── sufficient-interceptor/              MSI paper
│       │   ├── hierarchical-specialist-cascades/    HNC paper
│       │   ├── blank-screen-paradigm/               BSP paper
│       │   └── validation/                          empirical programme + panels
│       └── sources/                                 Buhera OS theoretical papers
│
├── crates/                                          Rust workspace (pre-existing scaffolding)
│   ├── consciousness-core
│   ├── atomic-scheduler
│   ├── task-coordinator
│   ├── ai-integration
│   ├── domain-bridge
│   └── config-manager
│
├── pugachev-cobra/                                  exploratory editor integration
├── pugachev-copilot/
│
└── docs/                                            top-level documentation index
```

The Rust workspace at [`crates/`](crates/) and the associated [`Cargo.toml`](Cargo.toml) are scaffolding from an earlier framing of the project. They are preserved for continuity but are not yet aligned with the current framework direction; the Rust-based substrate implementation (MSI encoder, backward navigation, kernel stub) is planned and will live in this workspace once the specification has stabilised.

## 5. Status

The project runs on two decoupled tracks.

**Theoretical track.** Mature at the level of the three extension papers and the six substrate manuscripts. Each paper is accompanied by a validation programme whose predictions are confirmed within the stated tolerances; see [`zoom-climb/docs/publications/validation/summary.json`](zoom-climb/docs/publications/validation/summary.json) and the per-paper summaries.

**Demonstration track.** Early. The `zoom-climb` Next.js application stands end-to-end with a keyword-matching intent extractor and three render-leaf stubs. Immediate milestones: (i) replace the stub extractor at [`src/pages/api/extract.ts`](zoom-climb/src/pages/api/extract.ts) with an OpenAI-backed structured-output call; (ii) lift render primitives from prior research tools (Hieronymus Omega, Honjo Masamune, Shakespear Nine) into the three render-leaves; (iii) extend the surface to compose multi-leaf results cleanly on cross-domain utterances.

**Substrate track.** Not yet initiated in its current form. The Rust workspace described in &sect;4 is scaffolding from the prior framing and does not implement the Buhera kernel. The long-term design calls for the substrate, microkernel stub, and MSI encoder to be implemented in Rust, compiled to WebAssembly for in-browser execution, and integrated into `zoom-climb` without displacing the TypeScript surface.

## 6. Author

Kundai Farai Sachikonye &middot; AIMe Registry for Artificial Intelligence &middot; <kundai.sachikonye@bitspark.com>

The manuscripts listed in &sect;2 are the citable units. Please cite each paper individually rather than the repository as a whole; the repository is the research record, the manuscripts are the research.

## 7. License

MIT. See [`LICENSE`](LICENSE).
