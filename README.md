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
