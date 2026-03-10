/**
 * updateAudit.cjs
 * Run:  node updateAudit.cjs
 *
 * Fetches all commits from GitHub across every tsiemasilo account
 * and rewrites tsiemasiloAudit.txt with the latest data.
 */

const https = require("https");
const fs = require("fs");

const REPO = "mihle-matimba/mint";
const OUTPUT = "tsiemasiloAudit.txt";

const MY_ACCOUNTS = [
  "tsiemasilo-dev",
  "t-dev",
  "masilo",
  "mintdev",
  "masechabamaile",
  "manwhodevs",
  "algodev",
  "patymca",
  "mardeveloper",
  "marchdeveloper",
];

function normalize(name) {
  return (name || "").toLowerCase().replace(/[^a-z]/g, "");
}

function isMine(name) {
  return MY_ACCOUNTS.includes(normalize(name));
}

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        "User-Agent": "mint-audit-script",
        Accept: "application/vnd.github.v3+json",
      },
    };
    https
      .get(opts, (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          try {
            resolve({ data: JSON.parse(data), headers: res.headers });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function fetchAllCommits() {
  let all = [];
  let page = 1;
  while (page <= 30) {
    const url = `https://api.github.com/repos/${REPO}/commits?per_page=100&page=${page}`;
    const { data } = await get(url);
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}

function monthYear(iso) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}

async function run() {
  console.log("Fetching commits from GitHub...");
  const all = await fetchAllCommits();
  console.log("Total commits in repo:", all.length);

  const mine = all.filter((c) => isMine(c.commit.author.name));
  console.log("Your commits:", mine.length);

  // Account totals
  const byAccount = {};
  mine.forEach((c) => {
    const n = c.commit.author.name;
    if (!byAccount[n]) byAccount[n] = { count: 0, first: null, last: null };
    byAccount[n].count++;
    const d = c.commit.author.date;
    if (!byAccount[n].first || d < byAccount[n].first) byAccount[n].first = d;
    if (!byAccount[n].last || d > byAccount[n].last) byAccount[n].last = d;
  });

  // Group by month → date
  const byMonth = {};
  mine.forEach((c) => {
    const mo = monthYear(c.commit.author.date);
    const dt = c.commit.author.date.substring(0, 10);
    if (!byMonth[mo]) byMonth[mo] = {};
    if (!byMonth[mo][dt]) byMonth[mo][dt] = [];
    byMonth[mo][dt].push({
      sha: c.sha.substring(0, 7),
      author: c.commit.author.name,
      date: c.commit.author.date,
      msg: c.commit.message.split("\n")[0],
    });
  });

  const sortedMonths = Object.keys(byMonth).sort(
    (a, b) => new Date("01 " + a) - new Date("01 " + b)
  );

  const firstDate = mine.length
    ? formatDate(mine[mine.length - 1].commit.author.date)
    : "—";
  const lastDate = mine.length
    ? formatDate(mine[0].commit.author.date)
    : "—";

  const divider = "─".repeat(80);
  const thick = "=".repeat(80);

  let out = "";

  out += thick + "\n";
  out += `  MINT APP — DEVELOPMENT AUDIT\n`;
  out += `  Developer: tsiemasilo-dev\n`;
  out += `  Repository: github.com/${REPO}\n`;
  out += `  Period: ${firstDate} – ${lastDate}\n`;
  out += `\n`;
  out += `  Accounts tracked:\n`;
  out += `    tsiemasilo-dev  ·  T-Dev  ·  Masilo  ·  MintDev  ·  masechabamaile\n`;
  out += `    manwhodevs  ·  AlgoDev  ·  patymca\n`;
  out += `    MarDeveloper  ·  MarchDeveloper  (AI-assisted sessions)\n`;
  out += `\n`;
  out += `  Last updated: ${new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}\n`;
  out += `  Total Commits: ${mine.length}\n`;
  out += thick + "\n";

  // Commit log by month and date
  for (const mo of sortedMonths) {
    const dates = Object.keys(byMonth[mo]).sort();
    const monthTotal = dates.reduce(
      (s, d) => s + byMonth[mo][d].length,
      0
    );

    out += "\n\n";
    out += divider + "\n";
    out += `  ${mo.toUpperCase()}  (${monthTotal} commits)\n`;
    out += divider + "\n";

    for (const dt of dates) {
      const entries = byMonth[mo][dt];
      out += `\n  ${formatDate(dt + "T00:00:00")}  [${entries.length} commit${entries.length > 1 ? "s" : ""}]\n`;
      for (const e of entries) {
        const label = `[${e.sha}] ${e.author}`;
        out += `  · ${label.padEnd(28)} ${e.msg}\n`;
      }
    }
  }

  // Account summary table
  out += "\n\n";
  out += divider + "\n";
  out += `  ACCOUNTS SUMMARY\n`;
  out += divider + "\n\n";
  out += `  ${"Account".padEnd(22)} ${"Commits".padEnd(10)} ${"First Commit".padEnd(18)} Last Commit\n`;
  out += `  ${"-".repeat(75)}\n`;
  for (const [name, info] of Object.entries(byAccount).sort(
    (a, b) => b[1].count - a[1].count
  )) {
    out += `  ${name.padEnd(22)} ${String(info.count).padEnd(10)} ${formatDate(info.first).padEnd(18)} ${formatDate(info.last)}\n`;
  }
  out += `  ${"-".repeat(75)}\n`;
  out += `  ${"TOTAL".padEnd(22)} ${mine.length}\n`;

  out += "\n\n";
  out += thick + "\n";
  out += `  End of Audit — Mint App (github.com/${REPO})\n`;
  out += thick + "\n";

  fs.writeFileSync(OUTPUT, out, "utf8");
  console.log(`\nAudit written to ${OUTPUT}`);
  console.log(`Total: ${mine.length} commits across ${Object.keys(byAccount).length} accounts`);
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
