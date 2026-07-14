/**
 * CMS integration test — verifies that every CMS-registered page route returns
 * 200 and renders sections driven by /admin/pages/[key] data.
 *
 * What it does:
 *   1. For each PAGE_REGISTRY key, write a unique marker string into a target
 *      section's data field via the SitePage model.
 *   2. Call the admin PATCH route indirectly via the dev-only revalidate shim
 *      below (which delegates to revalidateSite()).
 *   3. Hit the public URL and assert the marker is in the rendered HTML.
 *
 * Run after `npm run dev` is up on port 3000:
 *   node scripts/cms-integration-test.mjs
 */

import mongoose from "mongoose";
import { writeFileSync } from "node:fs";

const BASE = (() => {
    const raw = process.env.BASE_URL;
    if (raw && raw.startsWith("http")) return raw.replace(/\/+$/, "");
    return "http://localhost:3000";
})();
const RUN_ID = Date.now().toString(36);

const PAGES = [
  { key: "home", path: "/", section: "who-we-are", field: "description" },
  { key: "about-us", path: "/about-us", section: "hero-banner", field: "title" },
  { key: "teams", path: "/teams", section: "generic-content", field: "title" },
  { key: "career", path: "/career", section: "generic-content", field: "title" },
  { key: "contact-us", path: "/contact-us", section: "generic-content", field: "title" },
  { key: "faqs-page", path: "/faqs", section: "generic-content", field: "title" },
  { key: "events-page", path: "/events", section: "generic-content", field: "title" },
  { key: "partners", path: "/partners", section: "generic-content", field: "title" },
  { key: "blog-index", path: "/blog", section: "generic-content", field: "title" },
  { key: "news-index", path: "/news", section: "generic-content", field: "title" },
  { key: "privacy-page", path: "/privacy-policy", section: "legal-content", field: "title" },
  { key: "terms-page", path: "/terms-and-conditions", section: "legal-content", field: "title" },
  { key: "rule-book", path: "/rule-book", section: "legal-content", field: "title" },
  { key: "types-of-partners", path: "/types-of-partners", section: "generic-content", field: "title" },
];

async function ensureSection(db, page, marker) {
  const doc = await db.collection("sitepages").findOne({ key: page.key });
  if (!doc) return false;

  const existing = (doc.sections || []).find((s) => s.type === page.section);
  if (existing) {
    await db.collection("sitepages").updateOne(
      { key: page.key },
      {
        $set: {
          [`sections.$[el].data.${page.field}`]: marker,
          [`sections.$[el].title`]: marker,
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "el.type": page.section }] },
    );
  } else {
    const maxOrder = (doc.sections || []).reduce((m, s) => Math.max(m, s.order ?? 0), -1);
    await db.collection("sitepages").updateOne(
      { key: page.key },
      {
        $push: {
          sections: {
            _id: `auto-${page.section}-${Date.now()}`,
            type: page.section,
            order: maxOrder + 1,
            title: marker,
            data: { [page.field]: marker },
            active: true,
          },
        },
      },
    );
  }
  return true;
}

async function bustCache() {
  // The admin PATCH route calls revalidateSite(). Without auth we hit the
  // /api/admin/pages endpoint which 401s/403s, but the request still flows
  // through the route handler. unstable_cache honors revalidateTag only when
  // called from inside a request context — without it the cache stays.
  //
  // For deterministic tests, use a dev-only revalidate endpoint:
  //   GET /api/dev/revalidate?tag=site-context
  // The endpoint is mounted only when NODE_ENV !== "production".
  try {
    await fetch(`${BASE}/api/dev/revalidate?tag=site-context`, { method: "POST" });
  } catch {
    /* ignore */
  }
}

async function main() {
  console.log(`\n=== CMS integration test (run=${RUN_ID}) ===\n`);

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set. Load .env first.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const results = [];

  for (const page of PAGES) {
    const marker = `BRPL-CMS-PROOF-${RUN_ID}-${page.key}`;
    const ok = await ensureSection(db, page, marker);
    if (!ok) {
      results.push({ ...page, marker, status: "SKIP", reason: "no doc" });
      continue;
    }
  }

  // Bust cache once after all writes.
  await bustCache();

  for (const page of PAGES) {
    const marker = `BRPL-CMS-PROOF-${RUN_ID}-${page.key}`;
    const res = await fetch(`${BASE}${page.path}`);
    const html = await res.text();
    const found = html.includes(marker);
    results.push({ ...page, marker, status: found ? "PASS" : "FAIL", http: res.status, htmlBytes: html.length });
  }

  await mongoose.disconnect();

  console.log("\nResults:");
  for (const r of results) {
    const tag = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "⊘";
    console.log(
      `  ${tag} ${r.path.padEnd(28)} ${r.status.padEnd(5)} http=${r.http || "-"} bytes=${r.htmlBytes || "-"}`,
    );
    if (r.reason) console.log(`      reason: ${r.reason}`);
  }

  const failed = results.filter((r) => r.status === "FAIL");
  console.log(`\nTotal: ${results.length} | Passed: ${results.length - failed.length} | Failed: ${failed.length}\n`);

  writeFileSync("/tmp/cms-integration-report.json", JSON.stringify(results, null, 2));

  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});