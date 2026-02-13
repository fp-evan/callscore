const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:3000";
const ORG_ID = "c2bd7425-df54-4a41-a1e0-88daa87763da";
const TRANSCRIPT_ID = "38ddcb17-2b38-41b1-a6c9-e2a002ed62db"; // Mike Thompson, completed eval
const TECH_ID = "6698519d-5b6c-4b36-90d8-4f7b9d851236"; // Mike Thompson

const OUT_DIR = path.resolve(__dirname, "../docs/screenshots");

const PAGES = [
  {
    name: "landing",
    url: `${BASE}`,
    width: 1280,
    height: 800,
    waitFor: 2000,
  },
  {
    name: "recording",
    url: `${BASE}/org/${ORG_ID}/record`,
    width: 1280,
    height: 800,
    waitFor: 2000,
  },
  {
    name: "transcript-detail",
    url: `${BASE}/org/${ORG_ID}/transcripts/${TRANSCRIPT_ID}`,
    width: 1280,
    height: 800,
    waitFor: 3000, // eval results may load async
  },
  {
    name: "dashboard",
    url: `${BASE}/org/${ORG_ID}/dashboard`,
    width: 1280,
    height: 800,
    waitFor: 4000, // charts take time to render
  },
  {
    name: "technician-profile",
    url: `${BASE}/org/${ORG_ID}/technicians/${TECH_ID}`,
    width: 1280,
    height: 800,
    waitFor: 3000,
  },
  {
    name: "criteria",
    url: `${BASE}/org/${ORG_ID}/settings/criteria`,
    width: 1280,
    height: 800,
    waitFor: 2000,
  },
  {
    name: "mobile",
    url: `${BASE}/org/${ORG_ID}/record`,
    width: 375,
    height: 812,
    waitFor: 2000,
  },
];

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const page of PAGES) {
    console.log(`Capturing ${page.name} (${page.width}x${page.height})...`);
    const tab = await browser.newPage();
    await tab.setViewport({ width: page.width, height: page.height });
    await tab.goto(page.url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, page.waitFor));
    const outPath = path.join(OUT_DIR, `${page.name}.png`);
    await tab.screenshot({ path: outPath, fullPage: false });
    console.log(`  → ${outPath}`);
    await tab.close();
  }

  await browser.close();
  console.log("\nDone! Screenshots saved to docs/screenshots/");
}

run().catch((err) => {
  console.error("Screenshot script failed:", err);
  process.exit(1);
});
