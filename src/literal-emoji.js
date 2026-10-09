import { PreprocessorReader } from '@asciidoctor/core'
import twemojiMap from './twemoji-map.js'

function codepointToChar(codepoint) {
  return codepoint
    .split('-')
    .map((cp) => String.fromCodePoint(Number.parseInt(cp, 16)))
    .join('')
}

/** Unicode sequence → twemoji short name (longest keys first for ZWJ / flags). */
const charToName = (() => {
  const map = new Map()
  for (const [name, codepoint] of Object.entries(twemojiMap)) {
    const ch = codepointToChar(codepoint)
    if (!map.has(ch)) map.set(ch, name)
  }
  return map
})()

const charKeysByLength = [...charToName.keys()].sort((a, b) => b.length - a.length)

export function replaceLiteralEmoji (text) {
  if (!text || charKeysByLength.length === 0) return text
  let out = ''
  let i = 0
  while (i < text.length) {
    let matched = false
    for (const ch of charKeysByLength) {
      if (text.startsWith(ch, i)) {
        out += `emoji:${charToName.get(ch)}[]`
        i += ch.length
        matched = true
        break
      }
    }
    if (!matched) {
      out += text[i]
      i += 1
    }
  }
  return out
}

const OPEN_LISTING = /^-{4,}(\s|$|\[)/
const CLOSE_LISTING = /^-{4,}\s*$/
const OPEN_PASS = /^\+{4,}(\s|$|\[)/
const CLOSE_PASS = /^\+{4,}\s*$/
const OPEN_LITERAL = /^\.{4,}(\s|$|\[)/
const CLOSE_LITERAL = /^\.{4,}\s*$/

/**
 * Rewrite literal Unicode emoji to `emoji:name[]` so the inline macro + Twemoji path runs.
 * Skips listing, passthrough, and literal blocks delimited by ---- / ++++ / ....
 */
export function transformLines (lines) {
  const state = { listing: 0, passthrough: 0, literal: 0 }
  return lines.map((line) => {
    if (state.listing > 0) {
      if (CLOSE_LISTING.test(line)) state.listing -= 1
      return line
    }
    if (state.passthrough > 0) {
      if (CLOSE_PASS.test(line)) state.passthrough -= 1
      return line
    }
    if (state.literal > 0) {
      if (CLOSE_LITERAL.test(line)) state.literal -= 1
      return line
    }
    if (OPEN_LISTING.test(line)) {
      state.listing += 1
      return line
    }
    if (OPEN_PASS.test(line)) {
      state.passthrough += 1
      return line
    }
    if (OPEN_LITERAL.test(line)) {
      state.literal += 1
      return line
    }
    // Inline passthrough / monospace — leave line unchanged if fully wrapped
    if (/^\+[^+].*\+$/.test(line.trim()) || /^`[^`].*`$/.test(line.trim())) {
      return line
    }
    return replaceLiteralEmoji(line)
  })
}

function emojiLiteralsEnabled (doc, lines) {
  const off = doc.getAttribute('emoji-literals')
  if (off === 'false' || off === false) return false
  return !lines.some((line) => /^:emoji-literals:\s*false\s*$/.test(line))
}

export function emojiLiteralPreprocessor () {
  this.process(function (doc, reader) {
    const lines = reader.getLines()
    if (!emojiLiteralsEnabled(doc, lines)) return reader
    const transformed = transformLines(lines)
    return new PreprocessorReader(doc, transformed, reader.getCursor(), {
      normalize: false,
    })
  })
}
