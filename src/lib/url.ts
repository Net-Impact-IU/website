// Prefix internal links and images with the site's base path,
// so the site works both on the custom domain and on github.io/website.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path: string): string {
  if (!path) return path;
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatDate(d: Date): { month: string; day: string; long: string } {
  const opts = { timeZone: 'America/Indiana/Indianapolis' } as const;
  return {
    month: d.toLocaleString('en-US', { ...opts, month: 'short' }),
    day: d.toLocaleString('en-US', { ...opts, day: 'numeric' }),
    long: d.toLocaleString('en-US', { ...opts, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  };
}
