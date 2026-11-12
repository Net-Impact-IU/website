# Net Impact Indiana University Undergrad website

The chapter website for Net Impact IU, the undergraduate Net Impact chapter at the Kelley School of Business.

- **Live site:** https://netimpactiu.org (until the domain is connected: https://net-impact-iu.github.io/website)
- **Officers editing content:** read [docs/UPDATING.md](docs/UPDATING.md). You never need to touch code.
- **This README:** for the technical maintainer.

## How it works

| Piece | What it does |
| --- | --- |
| [Astro](https://astro.build) | Builds the site into plain HTML pages. No JavaScript needed to read any page (important for SEO and AI search). |
| `src/content/` | Every word, link and image path on the site. Layout files never contain copy. |
| [Pages CMS](https://pagescms.org) + `.pages.yml` | The editing forms officers use. Saving a form commits to this repo. |
| GitHub Actions (`.github/workflows/deploy.yml`) | Builds and publishes to GitHub Pages on every change, and once a day so past events drop off. |

## Project map

```
.pages.yml                  Editing forms (one entry per form)
src/content/settings/       Site settings, officers, impact, FAQ, gallery, testimonials (JSON)
src/content/pages/          Page text and Google title/description for each page (JSON)
src/content/events/         One Markdown file per event
src/content/projects/       One Markdown file per client case study (shown only if client_approved)
src/content/blog/           One Markdown file per news post
src/content.config.ts       Schemas for events, projects and news
src/lib/data.ts             Loads content; filters past events, unapproved projects, unpublished posts
src/lib/url.ts              url() helper: always use it for internal links and images
src/styles/global.css       Design tokens (brand colors, type, spacing) and shared styles
src/components/             Header, footer, stats band, FAQ, events, officers, quotes, projects
src/pages/                  The 7 pages + 404 + robots.txt
public/images/brand/        Logo files (do not edit; see Brand rules)
public/images/uploads/      Photos uploaded through Pages CMS
scripts/check-content.mjs   Runs before every build; stops the deploy on missing files or required fields
```

## Run it locally

Requires Node 20 or newer.

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # outputs dist/
```

`[WARN] The collection "blog" does not exist or is empty` is expected until the first event, project or news post exists.

## Deploying

1. **GitHub Pages:** repo Settings > Pages > Source: **GitHub Actions**.
2. Push to `main` (or save in Pages CMS). The workflow builds and deploys in about a minute.
3. **Custom domain (netimpactiu.org):**
   - At the registrar, point the domain to GitHub Pages ([GitHub's DNS instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)).
   - Settings > Pages > Custom domain: `netimpactiu.org`, then tick **Enforce HTTPS**.
   - Settings > Secrets and variables > Actions > **Variables**: add `CUSTOM_DOMAIN` = `netimpactiu.org`. This switches canonical URLs, the sitemap and asset paths from `/website` to the root. Re-run the workflow.
   - Verify the domain in Google Search Console and submit `https://netimpactiu.org/sitemap-index.xml`.

## Pages CMS setup (one time)

1. Go to https://app.pagescms.org and sign in with the club's GitHub account.
2. Install the Pages CMS GitHub App on the `Net-Impact-IU` organization and select the `website` repo.
3. Open the repo in Pages CMS. The forms come from `.pages.yml`.
4. Invite officers by email under the repo's collaborators settings. They don't need GitHub accounts.

## Instagram feed (Events page)

The daily build pulls the 6 latest @netimpact_iu posts through Instagram's official API (`scripts/fetch-instagram.mjs`), saves resized copies of the images, and shows them on the Events page as plain HTML (no Instagram scripts on the site). If the token is missing or Instagram is down, the section hides itself and the rest of the site still deploys.

**Requirements:** @netimpact_iu must stay a Business or Creator account.

**Token:** stored as the repository secret `INSTAGRAM_TOKEN` (Settings > Secrets and variables > Actions). Long-lived tokens last 60 days; every build refreshes it, which resets the clock, so it should not expire while the daily build runs.

**If the feed disappears** (the build log shows `Instagram feed not updated` or `token refresh skipped`), the token was revoked, usually by a password change or removed app access. Fix in about 10 minutes:

1. Log in at https://developers.facebook.com with the account that owns the "Net Impact IU Website" app and open the app.
2. In the Instagram API setup (API setup with Instagram login), generate a new access token for @netimpact_iu.
3. Paste it into the `INSTAGRAM_TOKEN` repository secret (Update secret).
4. Actions > Build and deploy > Run workflow.

Run locally: `INSTAGRAM_TOKEN=... npm run fetch:instagram && npm run dev`.

## Events from beINvolved (Events page and home page)

Every build pulls Net Impact's upcoming events from beINvolved (`scripts/fetch-beinvolved.mjs`) and shows them as plain HTML next to any events typed into the Events form. Officers post an event on beINvolved once; it appears on the site after the next build (every 6 hours). No login, key or token is involved.

| Item | Value |
| --- | --- |
| Organization page | https://beinvolved.indiana.edu/organization/netimpact |
| Organization ID / URL key | 133614 / `netimpact` |
| Main source | iCal feed: `/organization/netimpact/events.ics` |
| Fallback source | Event search: `/api/discovery/event/search?organizationIds[0]=133614&...` (undocumented) |
| Output | `src/content/generated/beinvolved.json` (not committed) |

What the script does, and why:

- **Times:** beINvolved sends UTC. The site converts to Indiana time (`America/Indiana/Indianapolis`), so `2026-11-17T00:05Z` shows as Mon Nov 16, 7:05 pm.
- **Cancelled events** are dropped. **Members-only events** (visibility `Organization` in the fallback source) are dropped.
- **Duplicates:** two entries with the same start time show once. The entry in the room set under Site settings > General meeting room wins; otherwise the shorter title. Better fix: delete the duplicate in beINvolved.
- **Descriptions** are reduced to plain text and shortened; nothing from beINvolved is inserted as HTML.
- **If beINvolved is down or changes format,** the build still passes, the list shows only manual events, and the page keeps its "See all events on beINvolved" link. The build log says `beINvolved ... feed not read`.
- The fetch runs on GitHub's servers during the build, never in the visitor's browser (beINvolved does not allow cross-site browser requests).

Run locally: `npm run fetch:events && npm run dev`. The "Check event feed" workflow runs the script alone and prints the result.

## JavaScript on the site

The site is plain HTML first. Two small scripts add convenience and nothing depends on them:

| Script | Where | What it adds | With JavaScript off |
| --- | --- | --- | --- |
| Menu close | `src/components/Header.astro` | Mobile menu closes on a tap outside it, on Escape, or after choosing a link | Menu opens and closes with the Menu button |
| Copy email | `src/components/CopyEmail.astro` | "Copy email address" button on For Nonprofits | Button is hidden; the email link still works |

Related features that use plain links, no script: "Add to Google Calendar" on each event, gallery photos that open full size, and the announcement strip at the top of every page (Site settings > Announcement strip; leave it empty to hide it).

Rule for anything new: content must be in the HTML, and the page must still work with scripts off.

## Changing things

| Task | Where |
| --- | --- |
| Add a field to a form | Add it to the form in `.pages.yml` **and** to the JSON file or `content.config.ts` schema, then use it in the page |
| Add a page | New file in `src/pages/`, page text JSON in `src/content/pages/`, a form in `.pages.yml`, a link in `Header.astro` and `Footer.astro` |
| Change colors or type | `src/styles/global.css` tokens only. Check the brand rules first |
| Structured data (Google) | Built automatically in `src/layouts/Base.astro` from Site settings and Impact |

## Brand rules (from Net Impact nationals)

- Logo files in `public/images/brand/` are the chapter lockup built to the nationals spec. Don't stretch, recolor or crop them, and don't show the logo under 200 px wide.
- Don't separate the circle mark from the NET IMPACT text (that's why the favicon is a plain "NI" square).
- Headlines in primary blue `#0067B1`; body text in gray `#444D3E`. Cyan, orange and green fail contrast as text on white; use them only for decoration.
- When Net Impact Central provides the official chapter logo, replace `logo-color.svg`, `logo-white.svg` and the PNGs with the same file names.

Full design rules: the "Net Impact IU Website: Design Language and Constraints" doc.

## Accessibility and SEO checklist (before big changes go live)

- Every page works with JavaScript turned off
- One H1 per page; images have descriptions
- Lighthouse (Chrome DevTools) 90+ on mobile for Performance, Accessibility, Best Practices, SEO
- Google title under 60 characters and description under 160 (the content check warns)

## Handoff

The maintainer role passes to a new officer each year. Before handing off:

- [ ] Add the new maintainer as an owner of the `Net-Impact-IU` GitHub organization
- [ ] Walk them through this README and one full edit-build-deploy cycle
- [ ] Confirm the domain renewal is on autopay under the club account
- [ ] Update the exec handoff doc with where the logins live
