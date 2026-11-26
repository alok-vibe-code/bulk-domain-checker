import assert from 'node:assert/strict';
import test from 'node:test';
import { newDomainsCsv, resultsCsv } from '../../src/csv.js';

test('exports columns with UTF-8 BOM, CRLF records, Unicode, commas, and escaped quotes', () => {
  const rows = [{ input: 'https://bücher.de/a,b"c', domain: 'xn--bcher-kva.de', status: 'used' }];
  assert.equal(
    resultsCsv(rows),
    '\uFEFF"Original Input","Normalized Domain","Status"\r\n"https://bücher.de/a,b""c","xn--bcher-kva.de","Already Used"\r\n',
  );
  assert.equal(newDomainsCsv(['example.net', 'example.org']), '\uFEFF"Domain"\r\n"example.net"\r\n"example.org"\r\n');
});

test('neutralizes formula prefixes in user-controlled CSV fields', () => {
  const values = ['=1+1', '  +1', '-2', '@SUM(1,1)', '\tword', '\rword', '  ＝1', '\uFEFF@x', '\u0001-1'];
  const rows = values.map(input => ({ input, domain: null, status: 'invalid' }));
  for (const value of values) assert.ok(resultsCsv(rows).includes(`"'${value}","","Invalid"`));
});
