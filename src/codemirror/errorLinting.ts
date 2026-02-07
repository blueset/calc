import { StateField, StateEffect, Range } from '@codemirror/state'
import { EditorView, Decoration, DecorationSet } from '@codemirror/view'
import type { CalculationResult } from '@/calculator/calculator'

export interface ErrorDiagnostic {
  line: number
  column?: number
  message: string
}

export const setErrorDiagnostics = StateEffect.define<ErrorDiagnostic[]>()

export const errorLintField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorDiagnostics)) {
        const decos: Range<Decoration>[] = []
        for (const diag of e.value) {
          if (diag.line < 1 || diag.line > tr.state.doc.lines) continue
          const docLine = tr.state.doc.line(diag.line)
          const from = diag.column != null ? docLine.from + diag.column : docLine.from
          const to = docLine.to
          if (from >= to) continue
          decos.push(
            Decoration.mark({
              class: 'cm-calc-error',
              // attributes: { title: diag.message },
            }).range(from, to)
          )
        }
        return Decoration.set(decos.sort((a, b) => a.from - b.from))
      }
    }
    return decorations.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})

/**
 * Convert CalculationResult errors to ErrorDiagnostics
 */
export function extractErrorDiagnostics(errors: CalculationResult['errors']): ErrorDiagnostic[] {
  const diagnostics: ErrorDiagnostic[] = []

  for (const e of errors.parser) {
    diagnostics.push({
      line: e.line,
      message: e.error.message,
    })
  }

  for (const e of errors.runtime) {
    diagnostics.push({
      line: e.location?.line ?? 1,
      column: e.location?.column,
      message: e.message,
    })
  }

  return diagnostics
}
