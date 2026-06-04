export interface ScrollableTab {
  id: string
  scrollTop: number
}

export function normalizeScrollTop(scrollTop: number): number {
  return Number.isFinite(scrollTop) && scrollTop > 0 ? scrollTop : 0
}

export function updateTabScrollTop<T extends ScrollableTab>(
  tabs: T[],
  tabId: string,
  scrollTop: number
): T[] {
  const normalizedScrollTop = normalizeScrollTop(scrollTop)
  const targetTab = tabs.find((tab) => tab.id === tabId)
  if (!targetTab || targetTab.scrollTop === normalizedScrollTop) return tabs

  return tabs.map((tab) => (tab.id === tabId ? { ...tab, scrollTop: normalizedScrollTop } : tab))
}
