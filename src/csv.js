export const STATUS_LABELS = {
  new: 'New',
  used: 'Already Used',
  invalid: 'Invalid',
};

function escapeCell(value) {
  let cell = String(value ?? '');
  // Spreadsheet apps can interpret these prefixes as formulas, even after whitespace.
  if (/^[\t\r\n]|^[\s\u0000-\u001f]*[=+@＝＋＠－-]/u.test(cell)) cell = "'" + cell;
  return '"' + cell.replaceAll('"', '""') + '"';
}

function encodeCsv(records) {
  return '\uFEFF' + records.map(record => record.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

export function resultsCsv(rows) {
  return encodeCsv([
    ['Original Input', 'Normalized Domain', 'Status'],
    ...rows.map(({ input, domain, status }) => [input, domain, STATUS_LABELS[status]]),
  ]);
}

export function newDomainsCsv(domains) {
  return encodeCsv([['Domain'], ...domains.map(domain => [domain])]);
}
