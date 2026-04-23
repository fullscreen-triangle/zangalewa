import Head from "next/head";
import BlankSurface from "@/components/blank-surface/BlankSurface";

export default function HonjoPage() {
  return (
    <>
      <Head>
        <title>honjo · zoom-climb</title>
      </Head>
      <BlankSurface
        placeholder="e.g. how does caffeine bind adenosine A2a receptors"
        domainHint="honjo · observation-first cheminformatics"
      />
    </>
  );
}
