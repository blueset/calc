import { foldService } from '@codemirror/language'

/**
 * Custom fold service for markdown-style headings.
 * Folds from the end of a heading line to the line before the next heading
 * of equal or higher level (fewer # characters).
 */
export const foldHeadingsService = foldService.of((state, lineStart, lineEnd) => {
  const line = state.doc.lineAt(lineStart)
  const text = line.text
  const match = text.match(/^(#+)\s/)
  if (!match) return null

  const level = match[1].length

  // Search forward for the next heading of equal or higher level
  let foldEnd = state.doc.length
  for (let i = line.number + 1; i <= state.doc.lines; i++) {
    const nextLine = state.doc.line(i)
    const nextMatch = nextLine.text.match(/^(#+)\s/)
    if (nextMatch && nextMatch[1].length <= level) {
      // Fold up to the end of the previous line
      foldEnd = state.doc.line(i - 1).to
      break
    }
  }

  // Don't fold if there's nothing to fold
  if (foldEnd <= lineEnd) return null

  return { from: lineEnd, to: foldEnd }
})
