import assert from 'node:assert/strict';
import test from 'node:test';
import { compareDomains } from '../../src/compare.js';

test('compares each row, reports invalid historical lines, and counts each valid domain once', () => {
  const history = 'example.com\r\nwww.EXAMPLE.com\r\n\r\nnot a domain\r\nbücher.de';
  const candidates = ' https://www.example.com/article/ \nexample.net\nEXAMPLE.NET\n\nblog.example.com\n???\nxn--bcher-kva.de';
  const result = compareDomains(history, candidates);
  assert.deepEqual(result.rows, [
    { input: ' https://www.example.com/article/ ', domain: 'example.com', status: 'used' },
    { input: 'example.net', domain: 'example.net', status: 'new' },
    { input: 'EXAMPLE.NET', domain: 'example.net', status: 'new' },
    { input: 'blog.example.com', domain: 'blog.example.com', status: 'new' },
    { input: '???', domain: null, status: 'invalid' },
    { input: 'xn--bcher-kva.de', domain: 'xn--bcher-kva.de', status: 'used' },
  ]);
  assert.deepEqual(result.invalidHistoryLines, [4]);
  assert.deepEqual(result.newDomains, ['example.net', 'blog.example.com']);
  assert.deepEqual(result.counts, { total: 6, unique: 4, new: 2, used: 2, invalid: 1 });
});

test('allows empty history and ignores blank lines', () => {
  const empty = compareDomains('', '\r\n \n');
  assert.deepEqual(empty.counts, { total: 0, unique: 0, new: 0, used: 0, invalid: 0 });
  const result = compareDomains('', 'example.net\rexample.com');
  assert.deepEqual(result.newDomains, ['example.net', 'example.com']);
});

test('handles 20,000 candidates against 10,000 historical domains', () => {
  const history = Array.from({ length: 10000 }, (_, i) => `site-${i}.example.com`).join('\n');
  const candidates = Array.from({ length: 20000 }, (_, i) => `https://site-${i}.example.com/blog/`).join('\n');
  const result = compareDomains(history, candidates);
  assert.deepEqual(result.counts, { total: 20000, unique: 20000, new: 10000, used: 10000, invalid: 0 });
  assert.equal(result.newDomains[0], 'site-10000.example.com');
  assert.equal(result.newDomains.at(-1), 'site-19999.example.com');
});
