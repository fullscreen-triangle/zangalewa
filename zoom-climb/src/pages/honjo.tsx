import Head from "next/head";
import BlankSurface from "@/components/blank-surface/BlankSurface";

export default function HonjoPage() {
  return (
    <>
      <Head>
        <title>honjo · zoom-climb</title>
      </Head>
      <BlankSurface
        placeholder="e.g. caffeine binding affinity to adenosine A2a"
        domainHint="honjo · cheminformatics as observation"
      />
    </>
  );
}
