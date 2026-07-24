// Safe arithmetic expression evaluator for amount fields (US-42).
// Supports +, -, *, /, parentheses, and decimals only. No eval().
//
// evaluateAmountExpression() is the only export callers need — it returns
// a finite number on success, or null if the input isn't a valid plain
// number or expression. Callers should fall back to their existing
// amount validation (isNaN/<=0) when null is returned, rather than
// silently swallowing bad input.

// Tokenize into numbers and single-character operators/parens. Whitespace
// is stripped first; if the tokens don't reconstruct the original
// (whitespace-stripped) string exactly, the input contains characters we
// don't support and tokenization fails.
function tokenize(expr) {
  const stripped = expr.replace(/\s+/g, '');
  const tokenPattern = /[0-9]*\.[0-9]+|[0-9]+|[()+\-*/]/g;
  const tokens = stripped.match(tokenPattern) || [];
  if (tokens.join('') !== stripped) {
    throw new Error('Invalid character in expression');
  }
  return tokens;
}

// Recursive-descent parser:
//   addSub  -> mulDiv (('+' | '-') mulDiv)*
//   mulDiv  -> factor (('*' | '/') factor)*
//   factor  -> NUMBER | '(' addSub ')' | ('+' | '-') factor
function parseTokens(tokens) {
  let index = 0;
  const peek = () => tokens[index];
  const consume = () => tokens[index++];

  function parseFactor() {
    const token = peek();
    if (token === undefined) {
      throw new Error('Unexpected end of expression');
    }
    if (token === '(') {
      consume();
      const value = parseAddSub();
      if (consume() !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      return value;
    }
    if (token === '-') {
      consume();
      return -parseFactor();
    }
    if (token === '+') {
      consume();
      return parseFactor();
    }
    if (/^[0-9.]+$/.test(token)) {
      consume();
      const num = Number(token);
      if (Number.isNaN(num)) {
        throw new Error('Invalid number token');
      }
      return num;
    }
    throw new Error(`Unexpected token: ${token}`);
  }

  function parseMulDiv() {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseAddSub() {
    let value = parseMulDiv();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseMulDiv();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  const result = parseAddSub();
  if (index !== tokens.length) {
    throw new Error('Unexpected trailing tokens');
  }
  return result;
}

/**
 * Evaluates a simple arithmetic expression typed into an amount field
 * (e.g. "250+150", "(100/2)+50"). Returns a finite number on success, or
 * null if the input isn't a valid plain number or expression.
 */
export function evaluateAmountExpression(input) {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  if (trimmed === '') return null;

  // Plain numbers (the common case) skip tokenizing/parsing entirely.
  if (/^-?[0-9]*\.?[0-9]+$/.test(trimmed)) {
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }

  // Only attempt to evaluate strings that look like an arithmetic
  // expression (digits, operators, parens, decimals only). Anything else
  // returns null so the caller's existing validation handles it.
  if (!/^[0-9.+\-*/() ]+$/.test(trimmed)) return null;
  if (!/[+\-*/]/.test(trimmed)) return null;

  try {
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) return null;
    const result = parseTokens(tokens);
    return Number.isFinite(result) ? result : null;
  } catch (err) {
    return null;
  }
}
