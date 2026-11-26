import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const [template, js, css, projectLicense, ...licenses] = await Promise.all([
  readFile('index.html', 'utf8'),
  build({ entryPoints: ['src/app.js'], bundle: true, minify: true, legalComments: 'none', write: false }),
  build({ entryPoints: ['src/styles.css'], bundle: true, minify: true, write: false }),
  readFile('LICENSE', 'utf8'),
  ...['tldts', 'tldts-core'].map(async name => {
    const text = await readFile(`node_modules/${name}/LICENSE`, 'utf8');
    return `${name}\n${text.trim()}`;
  }),
]);

const script = js.outputFiles[0].text;
const style = css.outputFiles[0].text;
const hash = source => createHash('sha256').update(source).digest('base64');
const policy = [
  "default-src 'none'",
  `script-src 'sha256-${hash(script)}'`,
  `style-src 'sha256-${hash(style)}'`,
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

const output = template
  .replace('<!-- build:policy -->', () => `<meta http-equiv="Content-Security-Policy" content="${policy}">`)
  .replace('<link rel="stylesheet" href="./src/styles.css">', () => '<style>' + style + '</style>')
  .replace('<script type="module" src="./src/app.js"></script>', () => '<script>' + script + '</script>')
  .replace('</head>', () => `<!-- Bulk Domain Checker license\n${projectLicense.trim()}\n\nThird-party notices\n${licenses.join('\n\n')}\n-->\n  </head>`);

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', output);
console.log('Built dist/index.html. Open it directly in a browser or serve it as a static page.');
