import type { RenderLeafProps } from "./types";

/**
 * Cheminformatics render-leaf (stub).
 *
 * In the real system, this module takes a molecular S-coord + params
 * and renders a structure + property readout, lifted from Honjo.
 */
export default function ChemLeaf({ payload }: RenderLeafProps) {
  return (
    <div className="border border-primary/30 rounded-md p-4 bg-white/50">
      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">
        chem · stub
      </div>
      <pre className="text-xs overflow-auto whitespace-pre-wrap">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
