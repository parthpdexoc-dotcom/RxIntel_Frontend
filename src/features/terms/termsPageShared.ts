export type TermsSectionLink = { id: string; title: string };

const NUMBERED_SECTION = /^\s*\d+\.\s+/;

function collectSectionNodes(doc: Document): Element[] {
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));
  if (headings.length > 0) return headings;

  return Array.from(doc.querySelectorAll("p")).filter((p) =>
    NUMBERED_SECTION.test(p.textContent ?? "")
  );
}

/** Assign stable ids and build sidebar links for the terms document. */
export function prepareTermsDocument(html: string): {
  html: string;
  sections: TermsSectionLink[];
} {
  if (!html.trim()) return { html, sections: [] };

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nodes = collectSectionNodes(doc);
    const sections: TermsSectionLink[] = [];

    nodes.forEach((node, index) => {
      const id = `terms-section-${index + 1}`;
      node.setAttribute("id", id);
      const title = (node.textContent ?? "").trim() || `Section ${index + 1}`;
      sections.push({ id, title });
    });

    return { html: doc.body.innerHTML, sections };
  } catch {
    return { html, sections: [] };
  }
}

/** @deprecated Use prepareTermsDocument */
export function parseSectionHeadings(html: string): TermsSectionLink[] {
  return prepareTermsDocument(html).sections;
}

/** @deprecated Use prepareTermsDocument */
export function injectSectionIds(html: string): string {
  return prepareTermsDocument(html).html;
}
