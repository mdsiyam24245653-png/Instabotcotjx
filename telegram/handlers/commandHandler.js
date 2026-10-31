
const fs = require("fs");
const path = require("path");

const {
  getRole,
  isWhitelisted,
  isBanned,
  canRun
} = require("../utils/permissions");

const {
  readJson,
  writeJson
} = require("../utils/storage");

const commandsDir = path.join(__dirname, "..", "commands");
const commandRegistry = new Map();

function loadCommands() {
  commandRegistry.clear();

  if (!fs.existsSync(commandsDir)) {
    return commandRegistry;
  }

  for (const file of fs.readdirSync(commandsDir).filter((name) => name.endsWith(".js"))) {
    const command = require(path.join(commandsDir, file));

    if (!command || !command.name || typeof command.execute !== "function") {
      console.warn(`[TELEGRAM] Skipped invalid command file: ${file}`);
      continue;
    }

    commandRegistry.set(command.name.toLowerCase(), command);

    for (const alias of command.aliases || []) {
      commandRegistry.set(String(alias).toLowerCase(), command);
    }
  }

  console.log(
    `[TELEGRAM] Loaded ${new Set(commandRegistry.values()).size} commands.`
  );

  return commandRegistry;
}

function parseCommand(text, config, botUsername) {
  if (typeof text !== "string") return null;

  const prefix = String(config.prefix || ",");
  const trimmed = text.trim();

  const usedPrefix = trimmed.startsWith(prefix)
    ? prefix
    : (trimmed.startsWith("/") ? "/" : null);

  if (!usedPrefix) return null;

  const parts = trimmed
    .slice(usedPrefix.length)
    .trim()
    .split(/\s+/);

  if (!parts[0]) return null;

  let name = parts.shift().toLowerCase();

  if (botUsername) {
    name = name.replace(
      new RegExp(`@${botUsername}$`, "i"),
      ""
    );
  }

  return {
    name,
    args: parts
  };
}

async function handleCommand(ctx, config, api, botInfo) {
  const message = ctx.message;

  const parsed = parseCommand(
    message.text,
    config,
    botInfo?.username
  );

  if (!parsed) return false;

  const command = commandRegistry.get(parsed.name);

  if (!command) {
    await api.sendMessage(
      message.chat.id,
      `❓ Unknown command: ${parsed.name}`
    );
    return true;
  }

  const userId = message.from?.id;
  const chatId = message.chat.id;
  const role = getRole(config, userId);

  const database = readJson("banned.json", {
    users: [],
    chats: []
  });

  if (config.security?.blockBots && message.from?.is_bot) {
    return true;
  }

  if (!isWhitelisted(config, userId)) {
    await api.sendMessage(
      chatId,
      "⛔ এই বট ব্যবহারের অনুমতি তোমার নেই।"
    );
    return true;
  }

  if (isBanned(database, userId, chatId)) {
    await api.sendMessage(
      chatId,
      "🚫 এই অ্যাকাউন্ট বা চ্যাটটি বট ব্যবহারের জন্য নিষিদ্ধ।"
    );
    return true;
  }

  if (
    message.chat.type === "private" &&
    config.permissions?.allowPrivate === false
  ) {
    await api.sendMessage(
      chatId,
      "⛔ ব্যক্তিগত চ্যাটে এই বট ব্যবহার বন্ধ আছে।"
    );
    return true;
  }

  if (
    message.chat.type !== "private" &&
    config.permissions?.allowGroups === false
  ) {
    await api.sendMessage(
      chatId,
      "⛔ গ্রুপে এই বট ব্যবহার বন্ধ আছে।"
    );
    return true;
  }

  const ignored = config.adminOnly?.ignoreCommands || [];

  if (
    config.adminOnly?.enabled &&
    role !== "owner" &&
    role !== "admin" &&
    !ignored.includes(command.name)
  ) {
    await api.sendMessage(
      chatId,
      "🔒 বটটি বর্তমানে শুধু Admin ব্যবহার করতে পারবেন।"
    );
    return true;
  }

  if (!canRun(config, command, role)) {
    await api.sendMessage(
      chatId,
      "⛔ এই কমান্ড ব্যবহারের অনুমতি তোমার নেই।"
    );
    return true;
  }

  const context = {
    api,
    config,
    message,
    chat: message.chat,
    from: message.from,
    args: parsed.args,
    command,
    role,
    database,

    send: (text, options) =>
      api.sendMessage(chatId, String(text), options || {}),

    reply: (text, options) =>
      api.sendMessage(chatId, String(text), {
        reply_to_message_id: message.message_id,
        ...options
      }),

    saveBans: (next) =>
      writeJson("banned.json", next)
  };

  try {
    await command.execute(context);
  } catch (error) {
    console.error(
      `[TELEGRAM] Command ${command.name} failed:`,
      error
    );

    await context.reply(
      "⚠️ কমান্ড চালাতে সমস্যা হয়েছে। পরে আবার চেষ্টা করো।"
    );
  }

  return true;
}

module.exports = {
  loadCommands,
  handleCommand,
  commandRegistry,
  parseCommand
};
        
