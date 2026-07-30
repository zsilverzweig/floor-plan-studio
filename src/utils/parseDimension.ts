import type { LengthUnit } from '../types'

/** Example placeholder shown in dimension inputs for the active unit. */
export function dimensionPlaceholder(unit: LengthUnit): string {
  switch (unit) {
    case 'ft':
      return '44/12'
    case 'in':
      return '44'
    case 'm':
      return '1.2'
    case 'cm':
      return '120'
  }
}

/** Hint text describing accepted input format for the active unit. */
export function dimensionInputHint(unit: LengthUnit): string {
  switch (unit) {
    case 'ft':
      return 'Enter feet — numbers or formulas like 44/12'
    case 'in':
      return 'Enter inches — numbers or formulas like 44/12'
    case 'm':
      return 'Enter meters — numbers or formulas like 3/2'
    case 'cm':
      return 'Enter centimeters — whole numbers or formulas'
  }
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' }
  | { type: 'lparen' }
  | { type: 'rparen' }

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const char = input[i]
    if (/\s/.test(char)) {
      i++
      continue
    }

    if (/[0-9.]/.test(char)) {
      let raw = ''
      let dotCount = 0
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === '.') dotCount++
        if (dotCount > 1) return null
        raw += input[i++]
      }
      if (raw === '.' || raw.endsWith('.')) return null
      const value = Number(raw)
      if (!Number.isFinite(value)) return null
      tokens.push({ type: 'number', value })
      continue
    }

    if (char === '(') {
      tokens.push({ type: 'lparen' })
      i++
      continue
    }
    if (char === ')') {
      tokens.push({ type: 'rparen' })
      i++
      continue
    }
    if ('+-*/'.includes(char)) {
      tokens.push({ type: 'op', value: char as '+' | '-' | '*' | '/' })
      i++
      continue
    }

    return null
  }

  return tokens
}

function parseExpression(tokens: Token[], pos: { i: number }): number | null {
  let left = parseTerm(tokens, pos)
  if (left === null) return null

  while (pos.i < tokens.length) {
    const token = tokens[pos.i]
    if (token.type !== 'op' || (token.value !== '+' && token.value !== '-')) break
    pos.i++
    const right = parseTerm(tokens, pos)
    if (right === null) return null
    left = token.value === '+' ? left + right : left - right
  }

  return left
}

function parseTerm(tokens: Token[], pos: { i: number }): number | null {
  let left = parseUnary(tokens, pos)
  if (left === null) return null

  while (pos.i < tokens.length) {
    const token = tokens[pos.i]
    if (token.type !== 'op' || (token.value !== '*' && token.value !== '/')) break
    pos.i++
    const right = parseUnary(tokens, pos)
    if (right === null) return null
    if (token.value === '/' && right === 0) return null
    left = token.value === '*' ? left * right : left / right
  }

  return left
}

function parseUnary(tokens: Token[], pos: { i: number }): number | null {
  const token = tokens[pos.i]
  if (token?.type === 'op' && token.value === '-') {
    pos.i++
    const value = parseUnary(tokens, pos)
    return value === null ? null : -value
  }
  if (token?.type === 'op' && token.value === '+') {
    pos.i++
    return parseUnary(tokens, pos)
  }
  return parsePrimary(tokens, pos)
}

function parsePrimary(tokens: Token[], pos: { i: number }): number | null {
  const token = tokens[pos.i]
  if (!token) return null

  if (token.type === 'number') {
    pos.i++
    return token.value
  }

  if (token.type === 'lparen') {
    pos.i++
    const value = parseExpression(tokens, pos)
    if (value === null) return null
    if (tokens[pos.i]?.type !== 'rparen') return null
    pos.i++
    return value
  }

  return null
}

/** Parse a numeric dimension or simple formula (e.g. `44/12`, `10 + 3/12`). */
export function parseDimensionExpression(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (!/^[\d.\s+\-*/()]+$/.test(trimmed)) return null

  const tokens = tokenize(trimmed)
  if (!tokens?.length) return null

  const pos = { i: 0 }
  const value = parseExpression(tokens, pos)
  if (value === null || pos.i !== tokens.length) return null
  if (!Number.isFinite(value)) return null
  return value
}
