import type { RenderLeafProps } from "./types";

/**
 * Spectrometry / instrument render-leaf (stub).
 *
 * In the real system, this module takes a spectral S-coord + params
 * and renders a spectrum or instrument readout, lifted from Shakespear.
 */
export default function SpecLeaf({ payload }: RenderLeafProps) {
  return (
    <div className="border border-primary/30 rounded-md p-4 bg-white/50">
      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">
        spec · stub
      </div>
      <pre className="text-xs overflow-auto whitespace-pre-wrap">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
