import type { RenderLeafProps } from "./types";

/**
 * Research render-leaf.
 *
 * Takes a completed trajectory's structured research payload and
 * renders a distilled information card — the text-based observation
 * target. Discipline: every field is short-form, no Wikipedia-length
 * paragraphs, no disclaimers. The LLM's system prompt enforces
 * concision; the component only has to lay the content out cleanly.
 */
export default function ResearchLeaf({ payload }: RenderLeafProps) {
  const { kind, title, sections, tag, references } = payload.params;

  return (
    <article className="flex flex-col gap-5 py-2">
      <header className="flex flex-col gap-1">
        {kind && (
          <div className="text-[10px] uppercase tracking-[0.25em] opacity-50">
            {kind}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl leading-tight font-medium">
          {title}
        </h2>
        {tag && (
          <div className="text-xs opacity-60 mt-1">{tag}</div>
        )}
      </header>

      <div className="flex flex-col gap-4">
        {sections.map((section, i) => (
          <section key={i} className="flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-widest opacity-50">
              {section.heading}
            </div>
            <p className="text-sm leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>

      {references && references.length > 0 && (
        <footer className="flex flex-col gap-1 pt-2 border-t border-dark/10">
          <div className="text-[10px] uppercase tracking-widest opacity-50">
            references
          </div>
          <ul className="flex flex-col gap-1 text-xs opacity-70">
            {references.map((ref, i) => (
              <li key={i}>
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-primary transition-colors"
                  >
                    {ref.citation}
                  </a>
                ) : (
                  ref.citation
                )}
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}
