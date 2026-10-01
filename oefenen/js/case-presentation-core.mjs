// Saved attempts may contain an older exam snapshot. Reuse a reviewed layout
// only when that snapshot still has exactly the same original case text.
export function createCaseRegistry(exams, signature) {
  const byId = new Map(), bySource = new Map();
  for (const exam of exams) for (const section of exam.sections || []) {
    if (!section.contentPresentationHtml) continue;
    const entry = {source: signature(section.contentHtml), html: section.contentPresentationHtml};
    byId.set(section.id, entry);
    if (!bySource.has(entry.source)) bySource.set(entry.source, entry);
  }
  return {
    select(id, html) {
      const source = signature(html);
      const entry = byId.has(id) ? byId.get(id) : bySource.get(source);
      return entry?.source === source ? entry.html : html;
    }
  };
}
