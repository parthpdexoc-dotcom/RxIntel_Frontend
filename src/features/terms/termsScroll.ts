export function scrollToSectionInContainer(
  scrollRoot: HTMLElement,
  sectionId: string,
  offsetPx = 12
): boolean {
  const el = scrollRoot.querySelector(`#${CSS.escape(sectionId)}`) as HTMLElement | null;
  if (!el) return false;

  const rootTop = scrollRoot.getBoundingClientRect().top;
  const elTop = el.getBoundingClientRect().top;
  const nextTop = scrollRoot.scrollTop + (elTop - rootTop) - offsetPx;
  scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  return true;
}

/** Last section whose heading is at or above the top of the scroll viewport. */
export function findActiveSectionInScrollContainer(
  scrollRoot: HTMLElement,
  sectionIds: string[],
  offsetPx = 24
): string | null {
  if (sectionIds.length === 0) return null;

  const scrollTop = scrollRoot.scrollTop;
  const rootTop = scrollRoot.getBoundingClientRect().top;
  const threshold = scrollTop + offsetPx;
  let active = sectionIds[0];

  for (const id of sectionIds) {
    const el = scrollRoot.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (!el) continue;
    const contentTop = scrollTop + (el.getBoundingClientRect().top - rootTop);
    if (contentTop <= threshold + 1) {
      active = id;
    }
  }

  return active;
}
