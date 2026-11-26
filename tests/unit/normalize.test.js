import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDomain } from '../../src/normalize.js';

test('normalizes hostnames and HTTP(S) URLs without changing other subdomains', () => {
  const cases = [
    ['example.com', 'example.com'],
    [' HTTPS://WWW.Example.COM.:443/article?q=1#intro ', 'example.com'],
    ['http://example.com/path', 'example.com'],
    ['EXAMPLE.com:8080/path', 'example.com'],
    ['example.com?query=1', 'example.com'],
    ['https://www.example.co.uk/', 'example.co.uk'],
    ['blog.example.com.au.', 'blog.example.com.au'],
    ['example.in', 'example.in'],
    ['www.blog.example.com', 'blog.example.com'],
    ['a.www.example.com', 'a.www.example.com'],
    ['my-project.github.io', 'my-project.github.io'],
    ['https://WWW.BÜCHER.de/path', 'xn--bcher-kva.de'],
    ['xn--bcher-kva.de', 'xn--bcher-kva.de'],
  ];
  for (const [input, expected] of cases) assert.equal(normalizeDomain(input), expected, input);
});

test('rejects malformed, non-web, and non-domain entries', () => {
  const invalid = [
    '', ' ', 'not a domain', 'https:/example.com', 'http:///example.com',
    '//example.com', String.raw`https://example.com\path`, 'https://exam\tple.com',
    'https://person:@example.com', 'https://@example.com', 'person@example.com',
    'https://%65xample.com', 'ftp://example.com', 'javascript:alert(1)',
    'mailto:name@example.com', 'localhost:3000', '127.0.0.1', '[::1]',
    'example.invalid', 'co.uk', 'bad..example.com', 'example.com..',
    '-example.com', 'example-.com', 'foo_bar.com', 'example.com:99999',
    `${'a'.repeat(64)}.com`,
  ];
  for (const input of invalid) assert.equal(normalizeDomain(input), null, input);
});
