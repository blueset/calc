/**
 * Line Preprocessor for Nearley Parser
 *
 * Classifies and cleans lines before parsing:
 * - Detects empty lines (whitespace only)
 * - Detects headings (# at line start)
 * - Strips inline comments (everything from # onwards)
 * - Preserves line numbers for error reporting
 */

export type LineType = 'empty' | 'heading' | 'expression';

export interface PreprocessedLine {
  type: LineType;
  content: string;      // Cleaned content (for expression/heading text)
  lineNumber: number;   // 1-indexed line number
  originalText: string; // Original line text
  level?: number;       // Heading level (only for type='heading')
  contentOffset: number; // chars stripped from start by trim/comment removal
}

/**
 * Preprocess document input into classified lines
 */
export function preprocessDocument(input: string): PreprocessedLine[] {
  const lines = input.split('\n');
  const result: PreprocessedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const originalText = lines[i];
    const lineNumber = i + 1;

    // Check for empty line (whitespace only)
    if (originalText.trim() === '') {
      result.push({
        type: 'empty',
        content: '',
        lineNumber,
        originalText,
        contentOffset: 0
      });
      continue;
    }

    // Check for heading (# at line start)
    const headingMatch = originalText.match(/^(#+)\s*(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      result.push({
        type: 'heading',
        content: text,
        lineNumber,
        originalText,
        level,
        contentOffset: 0
      });
      continue;
    }

    // Expression line - strip inline comments
    // Find first # that's not part of a heading
    const hashIndex = originalText.indexOf('#');
    const beforeComment = hashIndex >= 0
      ? originalText.substring(0, hashIndex)
      : originalText;
    const cleaned = beforeComment.trim();
    const contentOffset = beforeComment.length - beforeComment.trimStart().length;

    result.push({
      type: 'expression',
      content: cleaned,
      lineNumber,
      originalText,
      contentOffset
    });
  }

  return result;
}

/**
 * Preprocess a single line (useful for testing or single-line parsing)
 */
export function preprocessLine(text: string, lineNumber: number = 1): PreprocessedLine {
  const originalText = text;

  // Check for empty line
  if (text.trim() === '') {
    return {
      type: 'empty',
      content: '',
      lineNumber,
      originalText,
      contentOffset: 0
    };
  }

  // Check for heading
  const headingMatch = text.match(/^(#+)\s*(.*)/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const content = headingMatch[2];
    return {
      type: 'heading',
      content,
      lineNumber,
      originalText,
      level,
      contentOffset: 0
    };
  }

  // Expression line - strip inline comments
  const hashIndex = text.indexOf('#');
  const beforeComment = hashIndex >= 0
    ? text.substring(0, hashIndex)
    : text;
  const cleaned = beforeComment.trim();
  const contentOffset = beforeComment.length - beforeComment.trimStart().length;

  return {
    type: 'expression',
    content: cleaned,
    lineNumber,
    originalText,
    contentOffset
  };
}
