// Auto-generate public/sitemap.xml from src/data/blogPosts.ts.
// Runs before `vite build` so the deployed sitemap always reflects the latest posts.
//
// Static routes are listed explicitly; blog posts are derived by extracting slug + isoDate from
// the blogPosts.ts source via regex (avoids needing a TS loader at build time).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BLOG_TS = resolve(ROOT, 'src/data/blogPosts.ts');
const OUT = resolve(ROOT, 'public/sitemap.xml');
const ORIGIN = 'https://expose.ae';
const TODAY = new Date().toISOString().slice(0, 10);

const STATIC_ROUTES = [
    { path: '/',          changefreq: 'weekly',  priority: '1.0', lastmod: TODAY },
    { path: '/blog',      changefreq: 'weekly',  priority: '0.8', lastmod: TODAY },
    { path: '/contact',   changefreq: 'monthly', priority: '0.5', lastmod: TODAY },
    { path: '/impressum', changefreq: 'monthly', priority: '0.3', lastmod: TODAY },
];

function extractBlogPosts(source) {
    // Match each post by pairing the nearest isoDate to each slug declaration.
    // blogPosts.ts always lists slug first inside an object, then isoDate a couple lines later.
    const re = /slug:\s*'([^']+)'[\s\S]*?isoDate:\s*'([^']+)'/g;
    const posts = [];
    let m;
    while ((m = re.exec(source)) !== null) {
        posts.push({ slug: m[1], isoDate: m[2] });
    }
    return posts;
}

function buildXml(urls) {
    const body = urls
        .map(({ path, lastmod, changefreq, priority }) => `  <url>
    <loc>${ORIGIN}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`)
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

const source = readFileSync(BLOG_TS, 'utf8');
const posts = extractBlogPosts(source);

const urls = [
    ...STATIC_ROUTES,
    ...posts.map(p => ({
        path: `/blog/${p.slug}`,
        lastmod: p.isoDate,
        changefreq: 'monthly',
        priority: '0.7',
    })),
];

writeFileSync(OUT, buildXml(urls));
console.log(`[sitemap] wrote ${urls.length} URLs (${posts.length} blog posts) → public/sitemap.xml`);
