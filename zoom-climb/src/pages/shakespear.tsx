import Head from "next/head";
import BlankSurface from "@/components/blank-surface/BlankSurface";

export default function ShakespearPage() {
  return (
    <>
      <Head>
        <title>shakespear · zoom-climb</title>
      </Head>
      <BlankSurface
        placeholder="e.g. 70 eV electron-impact mass spectrum of ethanol"
        domainHint="shakespear · instruments as observation"
      />
    </>
  );
}
