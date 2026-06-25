export const MAX_VIRTUAL_SPACER_ROW_HEIGHT = 250_000
export const MAX_VIRTUAL_SCROLL_HEIGHT = 2_000_000

export function getVirtualScrollScale(
  totalHeight: number,
  maxScrollHeight = MAX_VIRTUAL_SCROLL_HEIGHT
): number {
  const normalizedTotalHeight = Math.ceil(totalHeight)
  const normalizedMaxScrollHeight = Math.floor(maxScrollHeight)

  if (
    !Number.isFinite(normalizedTotalHeight) ||
    normalizedTotalHeight <= 0 ||
    !Number.isFinite(normalizedMaxScrollHeight) ||
    normalizedMaxScrollHeight <= 0
  ) {
    return 1
  }

  return Math.max(1, normalizedTotalHeight / normalizedMaxScrollHeight)
}

export function splitVirtualSpacerHeight(
  height: number,
  maxChunkHeight = MAX_VIRTUAL_SPACER_ROW_HEIGHT
): number[] {
  const totalHeight = Math.ceil(height)
  const chunkHeight = Math.floor(maxChunkHeight)

  if (!Number.isFinite(totalHeight) || totalHeight <= 0) return []
  if (!Number.isFinite(chunkHeight) || chunkHeight <= 0) return [totalHeight]

  const chunks: number[] = []
  let remaining = totalHeight
  while (remaining > 0) {
    const chunk = Math.min(remaining, chunkHeight)
    chunks.push(chunk)
    remaining -= chunk
  }
  return chunks
}
