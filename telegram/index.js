File: "telegram/index.js"

/**
 * GoatBot Messenger + Telegram Integration
 * Telegram Module
 *
 * Author: Project Maintainer
 * Version: 1.0.0
 * License: MIT
 *
 * Messenger configuration is read-only.
 * Telegram token is loaded from telegram/config.json.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { loadCommands } = require("./handlers/commandHandler");
const { dispatchUpdate } = require("./handlers/eventHandler");
const { logTelegramError } = require("./handlers/errorHandler");

const telegramConfigPath = path.join(__dirname, "config.json");
const messengerConfigPath = path.join(__dirname, "..", "config.json");

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadConfig() {
  const telegramConfig = readJSON(telegramConfigPath);
  const messengerConfig = readJSON(messengerConfigPath);

  // Messenger configuration remains unchanged.
  // Facebook UIDs and Telegram UIDs are different identifiers.
  telegramConfig.messengerPermissionSource = {
    adminBot: messengerConfig.adminBot || [],
    ownerUID: messengerConfig.security?.ownerUID || "",
    whitelistEnabled: Boolean(messengerConfig.whiteListMode?.enable),
    whitelistIds: messengerConfig.whiteListMode?.whiteListIds || [],
    adminOnlyEnabled: Boolean(messengerConfig.adminOnly?.enable)
  };

  return telegramConfig;
}

function createApi(token) {
  const baseURL = `https://api.telegram.org/bot${token}/`;

  const call = async (method, params = {}) => {
    const response = await axios.post(baseURL + method, params, {
      timeout: 40000
    });

    if (!response.data?.ok) {
      throw new Error(
        response.data?.description ||
        `Telegram API ${method} failed`
      );
    }

    return response.data.result;
  };

  return {
    getMe: () => call("getMe"),
    getUpdates: (params) => call("getUpdates", params),

    sendMessage: (chatId, text, options = {}) =>
      call("sendMessage", {
        chat_id: chatId,
        text,
        ...options
      }),

    getChatMember: (chatId, userId) =>
      call("getChatMember", {
        chat_id: chatId,
        user_id: userId
      }),

    banChatMember: (chatId, userId) =>
      call("banChatMember", {
        chat_id: chatId,
        user_id: userId
      }),

    unbanChatMember: (chatId, userId, options = {}) =>
      call("unbanChatMember", {
        chat_id: chatId,
        user_id: userId,
        ...options
      })
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = async function startTelegram() {
  const config = loadConfig();

  if (!config.enabled) {
    console.log("[TELEGRAM] Disabled.");
    return;
  }

  const token = config.botToken;

  if (!token || typeof token !== "string") {
    console.error(
      "[TELEGRAM] Bot token missing in telegram/config.json"
    );
    return;
  }

  const api = createApi(token);

  const botInfo = await api.getMe();

  loadCommands();

  console.log(
    `[TELEGRAM] Connected as @${botInfo.username || botInfo.id}`
  );

  console.log("[TELEGRAM] Long polling started.");

  let offset = 0;
  let stopping = false;

  const stop = () => {
    stopping = true;
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  while (!stopping) {
    try {
      const updates = await api.getUpdates({
        offset,
        timeout: Number(config.polling?.timeout) || 30,
        allowed_updates: ["message"]
      });

      for (const update of updates) {
        offset = update.update_id + 1;

        try {
          await dispatchUpdate(update, {
            api,
            config,
            botInfo
          });
        } catch (error) {
          logTelegramError(
            `update ${update.update_id}`,
            error
          );
        }
      }
    } catch (error) {
      logTelegramError("polling", error);

      if (error.response?.status === 401) {
        console.error("[TELEGRAM] Invalid bot token.");
        break;
      }

      if (error.response?.status === 409) {
        console.error(
          "[TELEGRAM] Another polling session is using this token."
        );
      }

      await sleep(
        Number(config.polling?.retryDelayMs) || 4000
      );
    }
  }

  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);

  console.log("[TELEGRAM] Polling stopped.");
};
