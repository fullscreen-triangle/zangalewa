import Head from "next/head";
import BlankSurface from "@/components/blank-surface/BlankSurface";

export default function ShakespearPage() {
  return (
    <>
      <Head>
        <title>shakespear · zoom-climb</title>
      </Head>
      <BlankSurface
        placeholder="e.g. what spectral signature identifies ethanol at 70 eV"
        domainHint="shakespear · observation-first instruments"
      />
    </>
  );
}
