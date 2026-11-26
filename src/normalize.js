import { parse } from 'tldts';

const HTTP_URL = /^https?:\/\//i;
const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const DNS_LABEL = /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/;

/** Return the normalized hostname, or null for an unsupported entry. */
export function normalizeDomain(input) {
  const value = input.trim();
  if (!value || /[\s\u0000-\u001f\u007f\\]/u.test(value)) return null;

  const hasProtocol = HTTP_URL.test(value);
  const authority = value.replace(HTTP_URL, '').split(/[/?#]/, 1)[0];
  if (!authority || /[@%]/.test(authority)) return null;
  if (!hasProtocol && SCHEME.test(value) && !/:\d+$/.test(authority)) return null;

  let hostname;
  try {
    // URL handles the port and converts Unicode domain names to ASCII (Punycode).
    hostname = new URL(hasProtocol ? value : `https://${value}`).hostname;
  } catch {
    return null;
  }
  hostname = hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  const labels = hostname.split('.');
  if (hostname.length > 253 || labels.length < 2 || !labels.every(label => DNS_LABEL.test(label))) {
    return null;
  }

  // Use the suffix list to validate the hostname but retain all subdomains except www.
  const { domain, isIcann } = parse(hostname, { extractHostname: false });
  return domain && isIcann ? hostname : null;
}
