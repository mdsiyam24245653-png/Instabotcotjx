
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { loadCommands } = require("./handlers/commandHandler");
const { dispatchUpdate } = require("./handlers/eventHandler");
const { logTelegramError } = require("./handlers/errorHandler");

const configPath = path.join(__dirname, "config.json");

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  // Keep Telegram permissions separate from Messenger Facebook UIDs.
  const ownerIds = (process.env.TELEGRAM_OWNER_IDS || "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  const adminIds = (process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",").map((id) => id.trim()).filter(Boolean);

  if (ownerIds.length) config.owner.ids = ownerIds;
  if (adminIds.length) config.admins = adminIds;

  // Telegram accepts the Messenger-style prefix; slash commands remain supported too.
  if (process.env.TELEGRAM_PREFIX) {
    config.prefix = process.env.TELEGRAM_PREFIX;
  }

  return config;
}

function createApi(token) {
  const baseURL = `https://api.telegram.org/bot${token}/`;

  const call = async (method, params = {}) => {
    const response = await axios.post(baseURL + method, params, {
      timeout: 40000
    });

    if (!response.data?.ok) {
      throw new Error(
        response.data?.description || `Telegram API ${method} failed`
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function startTelegram() {
  const config = loadConfig();

  if (!config.enabled) {
    console.log("[TELEGRAM] Disabled in telegram/config.json");
    return;
  }

  const tokenName = config.botTokenEnv || "TELEGRAM_BOT_TOKEN";
  const token = process.env[tokenName];

  if (!token) {
    console.warn(
      `[TELEGRAM] Not started: set the ${tokenName} environment variable.`
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
          logTelegramError(`update ${update.update_id}`, error);
        }
      }
    } catch (error) {
      logTelegramError("polling", error);

      if (error.response?.status === 401) {
        console.error("[TELEGRAM] Invalid token. Polling stopped.");
        break;
      }

      if (error.response?.status === 409) {
        console.error(
          "[TELEGRAM] Another polling session is using this token. Check other deployments."
        );
      }

      await sleep(Number(config.polling?.retryDelayMs) || 4000);
    }
  }

  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);

  console.log("[TELEGRAM] Polling stopped.");
};
    
