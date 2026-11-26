import { normalizeDomain } from './normalize.js';

function* entries(text) {
  for (const [index, input] of text.split(/\r\n|\n|\r/).entries()) {
    if (input.trim()) yield { line: index + 1, input, domain: normalizeDomain(input) };
  }
}

/** Compare two newline-delimited lists, keeping candidate rows in input order. */
export function compareDomains(historicalText, candidateText) {
  const history = new Set();
  const invalidHistoryLines = [];
  for (const { domain, line } of entries(historicalText)) {
    if (domain) history.add(domain);
    else invalidHistoryLines.push(line);
  }

  const rows = [];
  const newDomains = new Set();
  const usedDomains = new Set();
  let invalid = 0;

  for (const { input, domain } of entries(candidateText)) {
    let status = 'invalid';
    if (!domain) {
      invalid += 1;
    } else if (history.has(domain)) {
      usedDomains.add(domain);
      status = 'used';
    } else {
      newDomains.add(domain);
      status = 'new';
    }
    rows.push({ input, domain, status });
  }

  return {
    rows,
    newDomains: [...newDomains],
    invalidHistoryLines,
    historySize: history.size,
    counts: {
      total: rows.length,
      unique: newDomains.size + usedDomains.size,
      new: newDomains.size,
      used: usedDomains.size,
      invalid,
    },
  };
}
