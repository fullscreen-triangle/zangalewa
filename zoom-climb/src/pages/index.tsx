import Head from "next/head";
import Link from "next/link";

/**
 * Landing page.
 *
 * This is the only page in zoom-climb that is allowed conventional chrome,
 * because it is an onboarding meta-page about the demo — not a demo surface.
 * Everything under /hieronymus, /honjo, /shakespear is governed by BSP.
 */
export default function Landing() {
  return (
    <>
      <Head>
        <title>zoom-climb</title>
        <meta
          name="description"
          content="A demonstration of observation-first computing: one surface, one utterance, one rendered result."
        />
      </Head>
      <main className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
          <div className="w-full max-w-2xl flex flex-col gap-10">
            <header className="flex flex-col gap-3">
              <div className="text-[10px] uppercase tracking-[0.25em] opacity-50">
                zoom-climb
              </div>
              <h1 className="text-3xl sm:text-4xl leading-tight">
                observe, don&rsquo;t operate.
              </h1>
              <p className="text-sm sm:text-base opacity-80 leading-relaxed">
                Three research tools &mdash; microscopy, cheminformatics,
                spectrometry &mdash; conventionally require three browser
                tabs, three file uploads, three control panels, and a notebook
                to glue the results together. zoom-climb puts all three behind
                a single blank surface. You type what you want to observe; the
                system renders the answer. No applications, no filenames, no
                menus.
              </p>
            </header>

            <section className="flex flex-col gap-3">
              <div className="text-[10px] uppercase tracking-[0.25em] opacity-50">
                three on-ramps &mdash; one surface
              </div>
              <ul className="flex flex-col divide-y divide-dark/10">
                <li>
                  <Link
                    href="/hieronymus"
                    className="group flex flex-col py-4 hover:bg-dark/5 -mx-2 px-2 rounded transition-colors"
                  >
                    <span className="text-lg">
                      <span className="text-primary">/hieronymus</span>{" "}
                      &mdash; microscopy as observation
                    </span>
                    <span className="text-xs opacity-60 mt-1">
                      e.g. &ldquo;cortical neurons at 40&times; fluorescence,
                      channels 1 and 3&rdquo;
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/honjo"
                    className="group flex flex-col py-4 hover:bg-dark/5 -mx-2 px-2 rounded transition-colors"
                  >
                    <span className="text-lg">
                      <span className="text-primary">/honjo</span>{" "}
                      &mdash; cheminformatics as observation
                    </span>
                    <span className="text-xs opacity-60 mt-1">
                      e.g. &ldquo;caffeine binding affinity to adenosine
                      A2a&rdquo;
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shakespear"
                    className="group flex flex-col py-4 hover:bg-dark/5 -mx-2 px-2 rounded transition-colors"
                  >
                    <span className="text-lg">
                      <span className="text-primary">/shakespear</span>{" "}
                      &mdash; instruments as observation
                    </span>
                    <span className="text-xs opacity-60 mt-1">
                      e.g. &ldquo;70&thinsp;eV electron-impact mass spectrum of
                      ethanol&rdquo;
                    </span>
                  </Link>
                </li>
              </ul>
              <p className="text-xs opacity-60 leading-relaxed mt-2">
                The three pages are entry points, not separate tools. Any
                utterance routes to whichever leaf its coordinates select.
                A cross-domain utterance on any page composes multiple leaves
                on the same surface &mdash; which is the point.
              </p>
            </section>

            <footer className="text-[10px] uppercase tracking-[0.25em] opacity-40 pt-4">
              proof of principle &middot; v0
            </footer>
          </div>
        </div>
      </main>
    </>
  );
}
