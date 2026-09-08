#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const axe = require("axe-core");

const baseUrl = (process.argv[2] || "http://localhost:1313").replace(/\/$/, "");
const outDir = process.env.AXE_OUT_DIR || "a11y-hover-reports";
const maxPages = parseInt(process.env.AXE_MAX_PAGES || "0", 10);
const maxHover = parseInt(process.env.AXE_HOVER_MAX || "8", 10);

async function fetchSitemapUrls() {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const res = await fetch(sitemapUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  if (urls.length === 0) {
    throw new Error("No URLs found in sitemap.");
  }

  // `hugo server` does not always rewrite baseURL in sitemap.xml, so the sitemap
  // can advertise https://joegornick.com/... while you believe you are auditing
  // localhost. Following it verbatim silently audits the LIVE SITE and reports
  // the result as if it were your local build. Force every URL onto baseUrl.
  const base = new URL(baseUrl);
  let rewritten = 0;
  const normalized = urls.map((u) => {
    const parsed = new URL(u);
    if (parsed.origin !== base.origin) {
      rewritten++;
    }
    return new URL(parsed.pathname + parsed.search, base.origin).href;
  });
  if (rewritten > 0) {
    console.warn(
      `warning: rewrote ${rewritten} sitemap URL(s) onto ${base.origin} ` +
        `(sitemap.xml advertised a different host)`,
    );
  }

  return maxPages > 0 ? normalized.slice(0, maxPages) : normalized;
}

function safeFilename(url) {
  return url.replace(/^https?:\/\//, "").replace(/[^A-Za-z0-9._-]/g, "_");
}

async function run() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const urls = await fetchSitemapUrls();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let totalViolations = 0;

  for (const url of urls) {
    console.log(`Hover audit: ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.addScriptTag({ content: axe.source });

    const handles = await page.$$('[class*="hover:"]');
    const targets = handles.slice(0, maxHover);
    const pageReport = {
      url,
      maxHover,
      hovered: [],
      violations: [],
    };

    if (targets.length === 0) {
      const result = await page.evaluate(async () => {
        return await axe.run(document, {
          runOnly: { type: "rule", values: ["color-contrast"] },
        });
      });
      if (result.violations && result.violations.length > 0) {
        pageReport.violations.push({
          hover: null,
          violations: result.violations,
        });
        totalViolations += result.violations.length;
      }
    }

    for (const handle of targets) {
      const isVisible = await handle.isVisible().catch(() => false);
      if (!isVisible) {
        continue;
      }

      const meta = await handle.evaluate((el) => ({
        tag: el.tagName.toLowerCase(),
        className: el.getAttribute("class") || "",
        text: (el.textContent || "").trim().slice(0, 80),
      }));

      try {
        await handle.hover({ timeout: 2000 });
      } catch (err) {
        continue;
      }
      await page.waitForTimeout(50);

      const result = await page.evaluate(async () => {
        return await axe.run(document, {
          runOnly: { type: "rule", values: ["color-contrast"] },
        });
      });

      pageReport.hovered.push(meta);

      if (result.violations && result.violations.length > 0) {
        pageReport.violations.push({
          hover: meta,
          violations: result.violations,
        });
        totalViolations += result.violations.length;
      }
    }

    const outFile = path.join(outDir, `${safeFilename(url)}.json`);
    fs.writeFileSync(outFile, JSON.stringify(pageReport, null, 2));
    console.log(`Report: ${outFile}`);
    console.log("");
  }

  await browser.close();

  if (totalViolations > 0) {
    console.error(`Hover audit completed with ${totalViolations} violation(s).`);
    process.exit(1);
  }

  console.log("Hover audit completed with 0 violations.");
}

run().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
