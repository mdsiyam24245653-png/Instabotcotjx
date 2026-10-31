
/**
 * GoatBot Messenger + Telegram launcher.
 * Messenger runs in Goat.js; Telegram runs independently.
 */

const { spawn } = require("child_process");
const express = require("express");
const log = require("./logger/log.js");

const app = express();
const PORT = Number(process.env.PORT) || 10000;

let child = null;
let restarting = false;
let telegramStarted = false;

function startTelegram() {
  if (telegramStarted) return;

  try {
    const start = require("./telegram");

    if (typeof start !== "function") {
      throw new Error(
        "telegram/index.js must export a start function."
      );
    }

    telegramStarted = true;

    Promise.resolve(start()).catch((error) => {
      telegramStarted = false;
      log.error(
        "TELEGRAM",
        "Telegram startup failed: " + error.message
      );
    });
  } catch (error) {
    telegramStarted = false;
    log.error(
      "TELEGRAM",
      "Telegram module could not be loaded: " + error.message
    );
  }
}

function startProject() {
  log.info("MESSENGER", "Starting GoatBot...");

  child = spawn(process.execPath, ["Goat.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: false,
    env: process.env
  });

  child.on("error", (error) => {
    log.error(
      "MESSENGER",
      "Bot startup error: " + error.message
    );
    process.exit(1);
  });

  child.on("close", (code) => {
    log.info(
      "MESSENGER",
      "Bot process stopped with code: " + code
    );

    if (code === 2 && !restarting) {
      restarting = true;

      log.info("MESSENGER", "Restarting Messenger bot...");

      setTimeout(() => {
        restarting = false;
        startProject();
      }, 3000);
    } else {
      process.exit(code || 0);
    }
  });
}

app.get("/", (_req, res) => {
  res.status(200).send(
    "Messenger + Telegram bot service is running."
  );
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    messenger:
      child && child.exitCode === null
        ? "running"
        : "starting",
    telegram: telegramStarted
      ? "initializing-or-running"
      : "disabled"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  log.info(
    "SERVER",
    "Uptime server running on port " + PORT
  );

  startTelegram();
  startProject();
});
