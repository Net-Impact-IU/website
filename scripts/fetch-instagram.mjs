// Pulls the latest Instagram posts at build time and saves them as static content.
//
// Needs the repository secret INSTAGRAM_TOKEN (a long-lived Instagram API token for
// @netimpact_iu). Without it, or if Instagram is unreachable, this writes an empty feed
// and the Events page simply hides the Instagram section. It never fails the build.
//
// Output:
//   src/content/generated/instagram.json   post list read by the Events page
//   public/images/instagram/<id>.jpg        resized post images (served from our site)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const outJson = path.join(root, 'src/content/generated/instagram.json');
const imgDir = path.join(root, 'public/images/instagram');
const API = process.env.INSTAGRAM_API_BASE || 'https://graph.instagram.com';
const LIMIT = Number(process.env.INSTAGRAM_POST_LIMIT || 6);
const token = (process.env.INSTAGRAM_TOKEN || '').trim();

fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.mkdirSync(imgDir, { recursive: true });

const write = (posts, note) => {
  fs.writeFileSync(outJson, JSON.stringify({ fetched_at: new Date().toISOString(), posts }, null, 2));
  console.log(`Instagram: ${note}`);
};

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || `HTTP ${res.status}`);
  return body;
}

async function main() {
  if (!token) return write([], 'no INSTAGRAM_TOKEN set, section hidden');

  // Refreshing resets the token's 60-day clock. Works once the token is 24+ hours old.
  try {
    const r = await getJson(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    if (r.expires_in) {
      const days = Math.round(r.expires_in / 86400);
      console.log(`Instagram: token refreshed, valid ${days} more days`);
      if (days < 10) console.warn(`warning: Instagram token expires in ${days} days. See README > Instagram feed.`);
    }
  } catch (e) {
    console.warn(`warning: Instagram token refresh skipped (${e.message})`);
  }

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const data = await getJson(`${API}/me/media?fields=${fields}&limit=${LIMIT}&access_token=${encodeURIComponent(token)}`);

  const posts = [];
  for (const m of (data.data || []).slice(0, LIMIT)) {
    const src = m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url;
    if (!src || !m.permalink) continue;
    try {
      const res = await fetch(src, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const file = `${String(m.id).replace(/[^\w-]/g, '')}.jpg`;
      await sharp(buf).rotate().resize(640, 640, { fit: 'cover' }).jpeg({ quality: 78, progressive: true }).toFile(path.join(imgDir, file));
      const caption = (m.caption || '').trim();
      posts.push({
        id: m.id,
        image: `/images/instagram/${file}`,
        caption,
        alt: caption ? `Instagram post: ${caption.split('\n')[0].slice(0, 120)}` : 'Net Impact IU Instagram post',
        permalink: m.permalink,
        timestamp: m.timestamp,
        is_video: m.media_type === 'VIDEO',
      });
    } catch (e) {
      console.warn(`warning: skipped Instagram post ${m.id} (${e.message})`);
    }
  }
  write(posts, `${posts.length} posts saved`);
}

main().catch((e) => {
  console.warn(`warning: Instagram feed not updated (${e.message}). Section hidden this build.`);
  write([], 'feed unavailable');
});
