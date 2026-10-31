
/**
 * @author NTKhang
 * Official source: https://github.com/ntkhang03/Goat-Bot-V2
 */

const { spawn } = require("child_process");
const express = require("express");
const log = require("./logger/log.js");

const app = express();
const PORT = process.env.PORT || 10000;

let child;
let restarting = false;

function startProject() {
  log.info("Starting GoatBot...");

  child = spawn("node", ["Goat.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: false
  });

  child.on("error", (error) => {
    log.error("Bot startup error: " + error.message);
    process.exit(1);
  });

  child.on("close", (code) => {
    log.info("Bot process stopped with code: " + code);

    if (code === 2 && !restarting) {
      restarting = true;
      log.info("Restarting Project...");

      setTimeout(() => {
        restarting = false;
        startProject();
      }, 3000);
    } else {
      process.exit(code || 0);
    }
  });
}

app.get("/", (req, res) => {
  res.status(200).send("Bot is running!");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime()
  });
});

app.listen(PORT, "0.0.0.0", () => {
  log.info("Uptime server running on port " + PORT);
  startProject();
});
