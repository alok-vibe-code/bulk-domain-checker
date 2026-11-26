import { compareDomains } from './compare.js';
import { newDomainsCsv, resultsCsv, STATUS_LABELS } from './csv.js';

const byId = id => document.getElementById(id);
const form = byId('comparison');
const history = byId('history');
const candidates = byId('candidates');
const feedback = byId('feedback');
const results = byId('results');
const search = byId('search');
const filter = byId('filter');
const tbody = byId('rows');
const previous = byId('previous-page');
const next = byId('next-page');
const copy = byId('copy');
const downloadNew = byId('download-new');
const exportFeedback = byId('export-feedback');
const manualCopy = byId('manual-copy');
const copyList = byId('copy-list');
const pageSize = 50;

let comparison = null;
let page = 0;

function message(text, kind = '') {
  feedback.textContent = text;
  feedback.dataset.kind = kind;
}

function resetResults() {
  comparison = null;
  page = 0;
  results.hidden = true;
  search.value = '';
  filter.value = 'all';
  tbody.replaceChildren();
  byId('result-range').textContent = '';
  for (const key of ['total', 'unique', 'new', 'used', 'invalid']) byId('count-' + key).textContent = '0';
  history.removeAttribute('aria-invalid');
  candidates.removeAttribute('aria-invalid');
  copyList.value = '';
  manualCopy.hidden = true;
  exportFeedback.textContent = '';
  message('');
}

function renderResults() {
  if (!comparison) return;
  const term = search.value.trim().toLowerCase();
  const status = filter.value;
  const rows = comparison.rows.filter(row => (
    (status === 'all' || row.status === status) &&
    (!term || row.domain?.includes(term) || row.input.toLowerCase().includes(term))
  ));

  const start = page * pageSize;
  const fragment = document.createDocumentFragment();
  for (const { input, domain, status: rowStatus } of rows.slice(start, start + pageSize)) {
    const row = document.createElement('tr');
    row.insertCell().textContent = input;
    row.insertCell().textContent = domain ?? '–';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.dataset.status = rowStatus;
    badge.textContent = STATUS_LABELS[rowStatus];
    row.insertCell().append(badge);
    fragment.append(row);
  }
  tbody.replaceChildren(fragment);
  const end = Math.min(start + pageSize, rows.length);
  byId('result-range').textContent = rows.length
    ? `Showing ${start + 1}–${end} of ${rows.length} entries.`
    : 'No entries match the current search and status.';
  previous.disabled = page === 0;
  next.disabled = end >= rows.length;
}

function runComparison(event) {
  event.preventDefault();
  resetResults();
  if (!candidates.value.trim()) {
    candidates.setAttribute('aria-invalid', 'true');
    message('Paste at least one domain or URL to check.', 'warning');
    candidates.focus();
    return;
  }

  const result = compareDomains(history.value, candidates.value);
  const invalidHistoryCount = result.invalidHistoryLines.length;
  if (invalidHistoryCount && !result.historySize) {
    history.setAttribute('aria-invalid', 'true');
    message('The historical list contains no valid domains. Correct it or clear it to continue.', 'warning');
    history.focus();
    return;
  }

  comparison = result;
  for (const [key, count] of Object.entries(result.counts)) byId('count-' + key).textContent = count;
  copy.disabled = downloadNew.disabled = !result.newDomains.length;
  results.hidden = false;
  renderResults();
  if (invalidHistoryCount) {
    const lines = result.invalidHistoryLines.slice(0, 5).join(', ');
    const more = invalidHistoryCount > 5 ? ' and more' : '';
    const label = invalidHistoryCount === 1 ? 'line' : 'lines';
    message(`Skipped ${invalidHistoryCount} invalid historical ${label} (${lines}${more}). Results use the valid history only.`, 'warning');
  } else {
    message('Comparison complete.');
  }
}

function clearAll() {
  form.reset();
  resetResults();
}

function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

form.addEventListener('submit', runComparison);
byId('clear').addEventListener('click', () => {
  clearAll();
  message('All inputs and results cleared.');
  history.focus();
});
form.addEventListener('input', () => {
  if (comparison) {
    resetResults();
    message('The lists changed. Check domains again for updated results.');
  } else if (feedback.dataset.kind === 'warning') {
    resetResults();
  }
});

for (const control of [search, filter]) {
  control.addEventListener('input', () => {
    page = 0;
    renderResults();
  });
}

for (const [button, direction] of [[previous, -1], [next, 1]]) {
  button.addEventListener('click', () => {
    page += direction;
    renderResults();
    if (button.disabled) (direction < 0 ? next : previous).focus();
  });
}

copy.addEventListener('click', async () => {
  const active = comparison;
  if (!active?.newDomains.length) return;
  const text = active.newDomains.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    if (comparison !== active) return;
    manualCopy.hidden = true;
    copyList.value = '';
    exportFeedback.textContent = 'New domains copied to the clipboard.';
  } catch {
    if (comparison !== active) return;
    exportFeedback.textContent = 'Clipboard access is unavailable. Copy the selected text below.';
    copyList.value = text;
    manualCopy.hidden = false;
    copyList.focus();
    copyList.select();
  }
});

downloadNew.addEventListener('click', () => {
  if (comparison?.newDomains.length) downloadCsv('new-domains.csv', newDomainsCsv(comparison.newDomains));
});
byId('download-all').addEventListener('click', () => {
  if (comparison) downloadCsv('domain-check-results.csv', resultsCsv(comparison.rows));
});

// Browsers can keep a page alive when navigating away and then going back.
window.addEventListener('pagehide', clearAll);
window.addEventListener('pageshow', clearAll);
