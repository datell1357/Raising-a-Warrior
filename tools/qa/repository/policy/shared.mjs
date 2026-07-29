import { createScanner, SyntaxKind } from 'typescript/unstable/ast';

const regularExpressionPrefixKinds = new Set([SyntaxKind.OpenParenToken, SyntaxKind.OpenBracketToken, SyntaxKind.OpenBraceToken, SyntaxKind.CommaToken, SyntaxKind.ColonToken, SyntaxKind.SemicolonToken, SyntaxKind.QuestionToken, SyntaxKind.ReturnKeyword, SyntaxKind.ThrowKeyword, SyntaxKind.CaseKeyword, SyntaxKind.DeleteKeyword, SyntaxKind.VoidKeyword, SyntaxKind.TypeOfKeyword, SyntaxKind.NewKeyword, SyntaxKind.YieldKeyword, SyntaxKind.AwaitKeyword, SyntaxKind.ArrowToken]);

export function equal(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
export function pointer(path) { return `/${path}`; }
export function childPointer(at, key) { return `${at}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`; }

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

export function firstDifference(actual, expected, at) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return at;
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(actual[index], expected[index], `${at}/${index}`);
      if (difference) return difference;
    }
    return null;
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return at;
    if (!equal(Object.keys(actual).sort(), Object.keys(expected).sort())) return at;
    for (const key of Object.keys(expected)) {
      const difference = firstDifference(actual[key], expected[key], childPointer(at, key));
      if (difference) return difference;
    }
    return null;
  }
  return Object.is(actual, expected) ? null : at;
}

function canStartRegularExpression(kind) {
  return kind === undefined || regularExpressionPrefixKinds.has(kind) || (kind >= SyntaxKind.FirstAssignment && kind <= SyntaxKind.LastAssignment) || (kind >= SyntaxKind.FirstBinaryOperator && kind <= SyntaxKind.LastBinaryOperator);
}

export function stripComments(path, source) {
  let value = source;
  if (/\.[cm]?[jt]sx?$/i.test(path)) {
    const scanner = createScanner(false, undefined, source);
    const comments = [];
    let previous;
    for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
      if (kind === SyntaxKind.SlashToken && canStartRegularExpression(previous)) kind = scanner.reScanSlashToken();
      if (kind === SyntaxKind.SingleLineCommentTrivia || kind === SyntaxKind.MultiLineCommentTrivia) comments.push([scanner.getTokenStart(), scanner.getTokenEnd()]);
      else if (kind !== SyntaxKind.WhitespaceTrivia && kind !== SyntaxKind.NewLineTrivia) previous = kind;
      if (scanner.getTokenEnd() <= scanner.getTokenStart()) scanner.resetTokenState(scanner.getTokenStart() + 1);
    }
    let offset = 0;
    value = comments.map(([start, end]) => {
      const text = source.slice(offset, start);
      offset = end;
      return text;
    }).join('') + source.slice(offset);
  } else if (/\.(?:tf|gradle)$/i.test(path)) value = value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');
  if (/(?:\.tf|\.toml|\.properties|\.(?:sh|bash|zsh)|(?:^|\/)Dockerfile(?:\.|$))/i.test(path)) value = value.replace(/#[^\r\n]*/g, '');
  if (/\.properties$/i.test(path)) value = value.replace(/^\s*!.*$/gm, '');
  return value;
}

export function isInfrastructureConfiguration(path) {
  return /(?:\.tf|\.toml|\.gradle|\.properties|\.(?:sh|bash|zsh)|(?:^|\/)Dockerfile(?:\.|$))/i.test(path);
}
