
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");

const MAX_FILES = 400;
const MAX_DIRS = 500;
const MAX_FILE_SIZE = 1024 * 1024;
const MAX_FINDINGS = 150;
const TOTAL_TIMEOUT = 45000;
const FILE_TIMEOUT = 2500;
const WORKERS = 3;
const MESSAGE_LIMIT = 1000;

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".cache",
  "coverage",
  "dist",
  "build",
  "logs",
  "log",
  "database",
  "data",
  "sessions",
  "session",
  "tmp",
  "temp",
  "uploads",
  "storage",
  "backups",
  "backup"
]);

const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".json"
]);

let running = false;

function addFinding(list, type, file, line, detail) {
  if (list.length < MAX_FINDINGS) {
    list.push({
      type,
      file,
      line,
      detail
    });
  }
}

function relative(file) {
  return path.relative(ROOT, file)
    .split(path.sep)
    .join("/");
}

async function collectFiles() {
  const files = [];
  const queue = [ROOT];
  let dirs = 0;

  while (
    queue.length &&
    files.length < MAX_FILES &&
    dirs < MAX_DIRS
  ) {
    const dir = queue.shift();
    dirs++;

    let entries;

    try {
      entries = await fs.promises.readdir(
        dir,
        { withFileTypes: true }
      );
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          queue.push(full);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        if (SOURCE_EXTENSIONS.has(ext)) {
          files.push(full);
        }
      }
    }
  }

  return {
    files,
    dirs,
    limited:
      queue.length > 0 ||
      files.length >= MAX_FILES ||
      dirs >= MAX_DIRS
  };
}

function getLine(content, position) {
  return content.slice(0, position).split("\n").length;
}

function checkLocalModule(file, request) {
  const base = path.resolve(
    path.dirname(file),
    request
  );

  const candidates = [
    base,
    base + ".js",
    base + ".cjs",
    base + ".mjs",
    base + ".json",
    path.join(base, "index.js"),
    path.join(base, "index.cjs"),
    path.join(base, "index.json")
  ];

  return candidates.some(candidate => {
    try {
      return fs.statSync(candidate).isFile();
    } catch (_) {
      return false;
    }
  });
}

function syntaxCheck(file) {
  return new Promise(resolve => {
    let child;
    let output = "";
    let finished = false;

    const finish = result => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      if (child) child.kill("SIGKILL");

      finish({
        timeout: true,
        output: "Syntax check timed out"
      });
    }, FILE_TIMEOUT);

    try {
      child = spawn(
        process.execPath,
        ["--check", file],
        {
          stdio: ["ignore", "pipe", "pipe"]
        }
      );

      child.stdout.on("data", data => {
        output += data.toString().slice(0, 3000);
      });

      child.stderr.on("data", data => {
        output += data.toString().slice(0, 3000);
      });

      child.on("error", error => {
        finish({
          error: true,
          output: error.message
        });
      });

      child.on("close", code => {
        finish({
          ok: code === 0,
          output
        });
      });

    } catch (error) {
      finish({
        error: true,
        output: error.message
      });
    }
  });
}

async function inspectFile(file, findings) {
  const name = relative(file);
  const ext = path.extname(file).toLowerCase();

  let stat;

  try {
    stat = await fs.promises.stat(file);
  } catch (error) {
    addFinding(
      findings,
      "WARNING",
      name,
      1,
      "ফাইল পড়া যায়নি: " + error.message
    );
    return;
  }

  if (stat.size > MAX_FILE_SIZE) {
    return;
  }

  let content;

  try {
    content = await fs.promises.readFile(file, "utf8");
  } catch (error) {
    addFinding(
      findings,
      "WARNING",
      name,
      1,
      "ফাইল পড়া যায়নি: " + error.message
    );
    return;
  }

  if (content.includes("\0")) return;

  // JSON validation
  if (ext === ".json") {
    try {
      JSON.parse(content);
    } catch (error) {
      const match = /position (\d+)/i.exec(
        error.message
      );

      const line = match
        ? getLine(content, Number(match[1]))
        : 1;

      addFinding(
        findings,
        "ERROR",
        name,
        line,
        "JSON ভুল: " + error.message
      );
    }

    return;
  }

  // JavaScript syntax validation
  const syntax = await syntaxCheck(file);

  if (syntax.timeout) {
    addFinding(
      findings,
      "WARNING",
      name,
      1,
      "Syntax check সময়সীমা ছাড়িয়েছে।"
    );
  } else if (syntax.error || !syntax.ok) {
    const match = /:(\d+)(?::\d+)?/.exec(
      syntax.output
    );

    addFinding(
      findings,
      "ERROR",
      name,
      match ? Number(match[1]) : 1,
      "JavaScript syntax সমস্যা: " +
      syntax.output.trim().slice(-250)
    );
  }

  // Check missing local require paths
  const requirePattern =
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

  let match;

  while (
    (match = requirePattern.exec(content)) !== null
  ) {
    const request = match[1];

    if (
      (request.startsWith("./") ||
       request.startsWith("../")) &&
      !checkLocalModule(file, request)
    ) {
      addFinding(
        findings,
        "ERROR",
        name,
        getLine(content, match.index),
        "লোকাল মডিউল পাওয়া যায়নি: " + request
      );
    }
  }

  // Security warnings
  const securityChecks = [
    [
      /\beval\s*\(/g,
      "eval() ব্যবহার হয়েছে।"
    ],
    [
      /\bnew\s+Function\s*\(/g,
      "new Function() ব্যবহার হয়েছে।"
    ],
    [
      /\bexec(?:Sync)?\s*\(/g,
      "Shell command execution পাওয়া গেছে।"
    ]
  ];

  for (const [pattern, description] of securityChecks) {
    let found;

    while (
      (found = pattern.exec(content)) !== null
    ) {
      addFinding(
        findings,
        "WARNING",
        name,
        getLine(content, found.index),
        description
      );
    }
  }

  // Detect possible hard-coded secrets
  const secretPattern =
    /\b(password|passwd|access_token|api_key|client_secret|refresh_token|cookie)\s*[:=]\s*["'][^"']{8,}["']/ig;

  let secret;

  while (
    (secret = secretPattern.exec(content)) !== null
  ) {
    if (!/process\.env/i.test(secret[0])) {
      addFinding(
        findings,
        "SECURITY",
        name,
        getLine(content, secret.index),
        "সম্ভাব্য hard-coded secret পাওয়া গেছে। আসল মান গোপন রাখা হয়েছে।"
      );
    }
  }
}

function splitMessages(text) {
  const chunks = [];
  let current = "";

  for (const line of text.split("\n")) {
    if (
      (current + "\n" + line).length >
      MESSAGE_LIMIT &&
      current
    ) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}

module.exports = {
  config: {
    name: "doctor",
    version: "3.0.0",
    author: "Siyam",
    countDown: 60,
    role: 2,
    shortDescription: "Bot health checker",
    longDescription:
      "বটের JavaScript ও JSON ফাইল পরীক্ষা করে সমস্যা রিপোর্ট করে।",
    category: "owner",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    if (running) {
      return message.reply(
        "⏳ Doctor scan ইতিমধ্যে চলছে।"
      );
    }

    running = true;

    try {
      await message.reply(
        "🩺 DOCTOR SCAN শুরু হয়েছে।\n" +
        "ফাইল পরীক্ষা চলছে..."
      );

      const started = Date.now();
      const findings = [];

      const collected = await collectFiles();
      const files = collected.files;

      let next = 0;
      let processed = 0;
      let large = 0;
      let timedOut = false;
      let lastProgress = 0;

      async function worker() {
        while (true) {
          if (
            Date.now() - started >= TOTAL_TIMEOUT
          ) {
            timedOut = true;
            return;
          }

          const index = next++;

          if (index >= files.length) return;

          const file = files[index];

          try {
            const stat = await fs.promises.stat(file);

            if (stat.size > MAX_FILE_SIZE) {
              large++;
            } else {
              await inspectFile(file, findings);
            }
          } catch (error) {
            addFinding(
              findings,
              "WARNING",
              relative(file),
              1,
              "পরীক্ষা করা যায়নি: " + error.message
            );
          }

          processed++;

          if (
            processed % 50 === 0 &&
            processed !== lastProgress
          ) {
            lastProgress = processed;

            try {
              await message.reply(
                "🔎 অগ্রগতি: " +
                processed + "/" + files.length +
                " ফাইল পরীক্ষা হয়েছে।"
              );
            } catch (_) {}
          }
        }
      }

      const workers = [];

      for (let i = 0; i < WORKERS; i++) {
        workers.push(worker());
      }

      await Promise.all(workers);

      const errors = findings.filter(
        x => x.type === "ERROR"
      ).length;

      const warnings = findings.filter(
        x => x.type === "WARNING"
      ).length;

      const security = findings.filter(
        x => x.type === "SECURITY"
      ).length;

      const report = [
        "🩺 SIYAM BOT DOCTOR REPORT",
        "━━━━━━━━━━━━━━━━━━",
        "📁 মোট পাওয়া ফাইল: " + files.length,
        "✅ পরীক্ষা শেষ: " + processed,
        "⏭️ বড় ফাইল বাদ: " + large,
        "📂 পরীক্ষা করা ফোল্ডার: " + collected.dirs,
        "",
        "❌ Error: " + errors,
        "⚠️ Warning: " + warnings,
        "🔐 Security: " + security,
        ""
      ];

      if (timedOut) {
        report.push(
          "⏰ সময়সীমা শেষ হয়েছে। বাকি ফাইল পরীক্ষা করা হয়নি।"
        );
      }

      if (collected.limited) {
        report.push(
          "⚠️ ফাইল বা ফোল্ডারের সীমা পূর্ণ হয়েছে।"
        );
      }

      report.push("📋 বিস্তারিত সমস্যা:");

      if (findings.length === 0) {
        report.push(
          "✅ এই স্ক্যানে কোনো সমস্যা পাওয়া যায়নি।"
        );
      } else {
        findings.forEach((item, index) => {
          report.push(
            "",
            (index + 1) + ". [" + item.type + "]",
            "📂 ফাইল: " + item.file,
            "📍 লাইন: " + item.line,
            "সমস্যা: " + item.detail
          );
        });
      }

      if (findings.length >= MAX_FINDINGS) {
        report.push(
          "",
          "⚠️ রিপোর্ট সর্বোচ্চ " +
          MAX_FINDINGS +
          "টি সমস্যায় সীমিত।"
        );
      }

      report.push(
        "",
        "━━━━━━━━━━━━━━━━━━",
        "ℹ️ এটি Static Scan। সব Runtime/API সমস্যা ধরা সম্ভব নয়।",
        "🔒 কোনো ফাইল পরিবর্তন বা ডিলিট করা হয়নি।"
      );

      const chunks = splitMessages(
        report.join("\n")
      );

      for (let i = 0; i < chunks.length; i++) {
        await message.reply(
          "📄 রিপোর্ট " +
          (i + 1) + "/" + chunks.length +
          "\n\n" + chunks[i]
        );
      }

    } catch (error) {
      try {
        await message.reply(
          "❌ DOCTOR SCAN ERROR\n\n" +
          "সমস্যা: " +
          String(error.message || error).slice(0, 500) +
          "\n\nবটের Log পরীক্ষা করো।"
        );
      } catch (_) {
        console.error("Doctor command error:", error);
      }
    } finally {
      running = false;
    }
  }
};
