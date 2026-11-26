# Bulk Domain Checker

Bulk Domain Checker helps SEO and outreach teams compare candidate websites against their own historical lists. It replaces the paste-and-compare part of a Google Sheets workflow with a free tool that runs in the browser.

## Use the checker

1. Open a built copy of `index.html` in a browser. Download the **bulk-domain-checker** artifact from a [successful GitHub Actions run](https://github.com/alok-vibe-code/bulk-domain-checker/actions/workflows/ci.yml) and unzip it, or build it locally using the instructions below.
2. Paste previously used domains in **Historical / Already Used Domains** and candidates in **Domains to Check**. Use one domain or URL per line. You can leave history empty.
3. Select **Check Domains**. The results panel shows counts and a paginated table with **New**, **Already Used**, or **Invalid** for each candidate. Search by hostname or original input, or filter by status.
4. Copy the unique new domains, download them as CSV, or export all candidate rows as CSV. The table view can be filtered without changing the exports.

### How matching works

The checker accepts bare hostnames and HTTP or HTTPS URLs. It strips one leading `www.`, removes the port, URL path, query string, fragment, and trailing dot, and lowercases the hostname. Internationalized domains are compared and displayed in ASCII (Punycode). For example, `www.example.com` and `https://example.com/article` both become `example.com`. Other subdomains, such as `blog.example.com`, are matched separately. A bundled Public Suffix List helps validate public hostnames, including multi-part suffixes such as `co.uk`.

Blank lines are ignored. Invalid candidates appear in the results. Invalid historical lines are skipped with a warning when at least one valid historical domain remains. If the entire non-empty historical list is invalid, correct it or clear it before comparing.

**New** means the normalized hostname is absent from the supplied history. Submitted and invalid entries are row counts. Unique valid, new, and already-used counts are hostname counts. Repeated candidates remain visible in the table and the full CSV. The new-domain export contains each hostname once, in its first-seen order.

This version focuses on historical matching. Its scope excludes batch duplicate reporting, program-wise tracking, and CSV import. It validates hostname format and suffixes without looking up DNS or checking whether a site exists. It does not fetch Ahrefs DR, Moz DA, backlinks, traffic, or search indexing data.

### Privacy

Your data stays in your browser. We do not upload, save, or store your domain lists. Download your results before leaving the page.

The built page includes all assets and the suffix data, so it works offline. It processes inputs in memory and contains no analytics, third-party requests, cookies, or browser storage. Editing a list clears the prior results so exports always match the latest completed comparison. **Clear All** and page reloads clear the inputs and results.

## Develop and test

Use Node.js 24 or newer and npm.

```sh
npm ci
npm run build
npm test
npx playwright install chromium --only-shell
npm run test:browser
```

Open `dist/index.html` directly to use the finished app. The build bundles the vanilla JavaScript and styles into one HTML file, includes the license notices, and sets a Content Security Policy that blocks external requests. The source `index.html` is the build template.

Unit tests cover normalization, comparisons, large lists, and CSV encoding. Browser tests exercise the built page, offline use, filtering, exports, clipboard behavior, data clearing, and desktop and mobile accessibility. GitHub Actions runs these checks on pushes and pull requests into `main` and publishes the HTML from a passing build.

## WordPress integration

The comparison engine is independent of browser UI and WordPress APIs. A future `alok-site-core` integration at `/tools/bulk-domain-checker/` can reuse the engine with scoped styles and load the assets only on the tool page. WordPress setup and deployment are separate from this repository.

## Contributing

Open an issue for a bug or suggestion, or submit a pull request to `main`. Run the unit and browser tests, and use synthetic domain lists in examples, screenshots, and tests.

## License

[MIT](LICENSE).
