/**
 * vaHera parser — ported verbatim from long-grass `src/lib/vahera.js`.
 *
 * ONLY the parser is ported, deliberately. The interpreter needs a live
 * kernel; parsing is pure, so it can serve as a validator here without
 * dragging execution into the code tool.
 *
 * This is the empty-dictionary ground truth for vaHera generation: we ship
 * no opinion about what good vaHera looks like, we only ask the module's
 * own grammar whether it parses. Keep this file in exact sync with
 * long-grass — a divergence here is a divergence in what counts as valid,
 * which silently corrupts every measurement made against it.
 */

export type VaheraStatement =
  | { op: "describe"; target: string; text: string }
  | { op: "resolve"; target: string }
  | { op: "spawn"; program: string; target: string }
  | { op: "navigate" }
  | { op: "complete" }
  | { op: "memory_create"; coord: { k: number; t: number; e: number } }
  | { op: "memory_store"; name: string; text: string }
  | { op: "memory_find"; query: string; k: number }
  | { op: "memory_list" }
  | { op: "memory_dump"; name: string }
  | { op: "demon_sort" }
  | { op: "controller_verify" }
  | { op: "kernel_stats" }
  | { op: "kernel_trace" }
  | { op: "process_list" };

const S_COORD = /S\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)/;

/**
 * Parse vaHera source into statements. Throws on the first invalid line,
 * with "line N:" embedded in the message (the validator adapter reads that
 * back out to anchor repair prompts).
 */
export function parseVahera(src: string): VaheraStatement[] {
  const out: VaheraStatement[] = [];
  let lineNo = 0;

  for (const raw of src.split("\n")) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue;
    // "# aspect: NAME" registers a retrieval aspect; other # lines are comments.
    if (line.startsWith("# aspect:")) continue;
    if (line.startsWith("#")) continue;

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^describe\s+(\S+)\s+with\s+"([^"]*)"$/))) {
      out.push({ op: "describe", target: m[1], text: m[2] });
    } else if ((m = line.match(/^resolve\s+(\S+)$/))) {
      out.push({ op: "resolve", target: m[1] });
    } else if ((m = line.match(/^spawn\s+(\S+)\s+from\s+(\S+)$/))) {
      out.push({ op: "spawn", program: m[1], target: m[2] });
    } else if (line === "navigate to penultimate") {
      out.push({ op: "navigate" });
    } else if (line === "complete trajectory") {
      out.push({ op: "complete" });
    } else if (line.startsWith("memory create at")) {
      m = line.match(S_COORD);
      if (!m) throw new Error(`line ${lineNo}: expected S(k,t,e): ${line}`);
      out.push({
        op: "memory_create",
        coord: { k: parseFloat(m[1]), t: parseFloat(m[2]), e: parseFloat(m[3]) },
      });
    } else if ((m = line.match(/^memory\s+store\s+"([^"]*)"\s*=\s*"([^"]*)"$/))) {
      out.push({ op: "memory_store", name: m[1], text: m[2] });
    } else if ((m = line.match(/^memory\s+find\s+nearest\s+"([^"]*)"(?:\s+k=(\d+))?$/))) {
      out.push({ op: "memory_find", query: m[1], k: m[2] ? parseInt(m[2], 10) : 3 });
    } else if (line === "memory list") {
      out.push({ op: "memory_list" });
    } else if ((m = line.match(/^memory\s+dump\s+(\S+)$/))) {
      out.push({ op: "memory_dump", name: m[1] });
    } else if (line === "demon sort") {
      out.push({ op: "demon_sort" });
    } else if (line === "controller verify") {
      out.push({ op: "controller_verify" });
    } else if (line === "kernel stats") {
      out.push({ op: "kernel_stats" });
    } else if (line === "kernel trace") {
      out.push({ op: "kernel_trace" });
    } else if (line === "process list") {
      out.push({ op: "process_list" });
    } else {
      throw new Error(`line ${lineNo}: unknown vaHera: ${line}`);
    }
  }
  return out;
}
