#!/usr/bin/env node
/*
 * normalize-quotes.js — deterministic mechanical pass that enforces the quotation
 * mark and apostrophe conventions of the active --style. Generation does not
 * reliably produce typographic marks (models type straight ' in contractions even
 * when told to use curly), so this runs after the rewrite to guarantee consistency.
 *
 * Usage: node scripts/normalize-quotes.js <file.md> --style google|cmos|apa [--write]
 *
 *   google   -> STRAIGHT quotes and apostrophes ("  '); curly marks straightened.
 *   cmos/apa -> TYPOGRAPHIC (curly) quotes and apostrophes (“ ” ‘ ’); straight educated.
 *
 * Left untouched, so structure and code survive:
 *   - a leading YAML frontmatter block (--- ... ---), CRLF-aware
 *   - fenced code (``` / ~~~, CommonMark fence-length rules), inline `code`, and
 *     indented (4-space / tab) code blocks
 *   - hyphens: "--" is NEVER rewritten (converting it to an em dash corrupted CLI
 *     flags, punycode URLs, table delimiters, and numeric ranges). Convert a genuine
 *     "--" em dash by hand.
 *
 * Quote education runs on the whole prose line with inline-code spans masked, so a
 * quote or apostrophe next to `code` gets the right direction, and code is restored
 * verbatim afterward (offset-stable because education is a 1:1 character swap).
 *
 * Known limitations (rare; marks come out wrong, not fixed here — pinned by tests):
 *   - a leading-apostrophe elision ('twas, 'em, rock 'n' roll) educates to an opening quote
 *   - straight primes for feet/inches (5'11") curl
 *   - quotes inside HTML attributes or CommonMark link titles educate
 * Without --write the normalized text is printed to stdout. Exports { normalize }.
 */
'use strict';

const LSQUO = '‘', RSQUO = '’', LDQUO = '“', RDQUO = '”', EMDASH = '—', ENDASH = '–';
// A quote is "opening" after start, whitespace, an open bracket, a dash, or another
// opening quote (the last enables nested quotes: “ ‘Stop,’ … ”).
const OPEN = `[\\s([{${EMDASH}${ENDASH}\\-${LDQUO}${LSQUO}]`;

function educate(s) {
  // Double: opening only when it also precedes a non-space, so a dash-adjacent
  // end-of-clause quote (interrupted dialogue "going—") closes instead of opening.
  s = s.replace(new RegExp(`(^|${OPEN})"(?=\\S)`, 'g'), `$1${LDQUO}`);
  s = s.replace(/"/g, RDQUO);
  s = s.replace(new RegExp(`(^|${OPEN})'(?=\\d)`, 'g'), `$1${RSQUO}`); // elision/decade ’90s
  s = s.replace(new RegExp(`(^|${OPEN})'(?=\\S)`, 'g'), `$1${LSQUO}`); // opening single
  s = s.replace(/'/g, RSQUO);                                          // contractions/closing
  return s;
}

function straighten(s) {
  return s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

// Educate/straighten a prose line with inline-code spans masked to same-length
// filler (a word char, so adjacency is preserved), then restore code verbatim.
function transformLine(line, style) {
  const spans = [];
  const re = /`+[^`]*`+/g;
  let m;
  while ((m = re.exec(line)) !== null) spans.push([m.index, m.index + m[0].length]);
  let masked = line;
  for (const [s, e] of spans) masked = masked.slice(0, s) + 'a'.repeat(e - s) + masked.slice(e);
  let out = style === 'google' ? straighten(masked) : educate(masked); // 1:1, offset-stable
  for (const [s, e] of spans) out = out.slice(0, s) + line.slice(s, e) + out.slice(e);
  return out;
}

/** Normalize marks in `text` for `style`, skipping frontmatter and all code contexts. */
function normalize(text, style) {
  const lines = text.split('\n');
  const bare = (s) => s.replace(/\r$/, ''); // CRLF-aware line compare
  const out = [];
  let i = 0;

  // Leading YAML frontmatter: pass through verbatim, but only if it actually closes
  // (a lone leading "---" is a thematic break, not frontmatter — don't swallow the doc).
  if (bare(lines[0]) === '---') {
    let close = -1;
    for (let k = 1; k < lines.length; k += 1) { if (bare(lines[k]) === '---') { close = k; break; } }
    if (close !== -1) { for (; i <= close; i += 1) out.push(lines[i]); }
  }

  let inFence = false, fenceChar = '', fenceLen = 0, inIndent = false, prevBlank = true;
  for (; i < lines.length; i += 1) {
    const line = lines[i];
    const b = bare(line);
    const fm = b.match(/^( {0,3})(`{3,}|~{3,})(.*)$/); // fences allow <=3 leading spaces
    if (fm) {
      const ch = fm[2][0], len = fm[2].length, rest = fm[3];
      if (!inFence) { inFence = true; fenceChar = ch; fenceLen = len; }
      else if (ch === fenceChar && len >= fenceLen && /^\s*$/.test(rest)) { inFence = false; }
      out.push(line); prevBlank = false; inIndent = false; continue;
    }
    if (inFence) { out.push(line); prevBlank = false; continue; }
    if (b.trim() === '') { out.push(line); prevBlank = true; continue; } // blank keeps inIndent
    if (/^(?: {4,}|\t)/.test(b) && (prevBlank || inIndent)) {            // indented code block
      out.push(line); inIndent = true; prevBlank = false; continue;
    }
    inIndent = false; prevBlank = false;
    out.push(transformLine(line, style));
  }
  return out.join('\n');
}

module.exports = { normalize };

if (require.main === module) {
  const fs = require('fs');
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const styleIdx = args.indexOf('--style');
  const style = styleIdx >= 0 ? args[styleIdx + 1] : null;
  const file = args.find((a) => !a.startsWith('--') && a !== style);
  if (!file || !['google', 'cmos', 'apa'].includes(style)) {
    console.error('usage: normalize-quotes.js <file> --style google|cmos|apa [--write]');
    process.exit(2);
  }
  const result = normalize(fs.readFileSync(file, 'utf8'), style);
  if (write) {
    fs.writeFileSync(file, result);
    process.stderr.write(`normalized ${file} (--style ${style})\n`);
  } else {
    process.stdout.write(result);
  }
}
