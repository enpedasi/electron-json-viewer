import React from 'react'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let cached: { query: string; regex: RegExp } | null = null

function getSplitRegex(query: string): RegExp {
  if (cached && cached.query === query) return cached.regex
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
  cached = { query, regex }
  return regex
}

export function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text
  const parts = text.split(getSplitRegex(query))
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={index} className="current-highlight">
        {part}
      </span>
    ) : (
      part
    )
  )
}

export { escapeRegExp }
