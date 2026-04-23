import Head from "next/head";
import BlankSurface from "@/components/blank-surface/BlankSurface";

/**
 * Hieronymus entry point.
 *
 * Same universal surface as /, /honjo, /shakespear — the placeholder is
 * an onboarding hint, not a domain gate. Any utterance routes to whichever
 * leaf the coord extraction selects.
 */
export default function HieronymusPage() {
  return (
    <>
      <Head>
        <title>hieronymus · zoom-climb</title>
      </Head>
      <BlankSurface
        placeholder="e.g. tell me about rhodopsin in retinal rod cells"
        domainHint="hieronymus · observation-first imaging"
      />
    </>
  );
}
