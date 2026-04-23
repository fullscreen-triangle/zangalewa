import Head from "next/head";
import BlankSurface from "@/components/blank-surface/BlankSurface";

/**
 * Root surface.
 *
 * The first thing a visitor sees is the paradigm, not a page about it:
 * a blank surface with a cursor. The three domain-flavored pages
 * (/hieronymus, /honjo, /shakespear) are alternate entries onto the
 * same surface — any utterance routes to whichever leaf its coord selects.
 */
export default function RootSurface() {
  return (
    <>
      <Head>
        <title>zoom-climb</title>
        <meta
          name="description"
          content="Observation-first computing: one surface, one utterance, one rendered result."
        />
      </Head>
      <BlankSurface
        placeholder="observe anything — e.g. tell me about p53"
        domainHint="zoom-climb · enter observes · esc returns to blank"
      />
    </>
  );
}
