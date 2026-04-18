import type { RenderLeafProps } from "./types";

/**
 * Imaging render-leaf (stub).
 *
 * In the real system, this module takes a microscopy S-coord + params
 * and dispatches to the WebGPU shader pipeline lifted from Hieronymus.
 * For now, it only echoes the payload so the surface plumbing can be
 * verified end-to-end.
 */
export default function ImagingLeaf({ payload }: RenderLeafProps) {
  return (
    <div className="border border-primary/30 rounded-md p-4 bg-white/50">
      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">
        imaging · stub
      </div>
      <pre className="text-xs overflow-auto whitespace-pre-wrap">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
