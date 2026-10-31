
function idIn(list, id) {
  return Array.isArray(list) &&
    list.some((item) => String(item) === String(id));
}

function getRole(config, userId) {
  if (!userId) return "guest";

  if (idIn(config.owner?.ids, userId)) {
    return "owner";
  }

  if (idIn(config.admins, userId)) {
    return "admin";
  }

  return "user";
}

function isWhitelisted(config, userId) {
  if (!config.whitelist?.enabled) return true;

  return (
    idIn(config.whitelist.ids, userId) ||
    idIn(config.owner?.ids, userId) ||
    idIn(config.admins, userId)
  );
}

function isBanned(database, userId, chatId) {
  const users = database?.users || [];
  const chats = database?.chats || [];

  return (
    users.some((item) => String(item.id) === String(userId)) ||
    chats.some((item) => String(item.id) === String(chatId))
  );
}

function canRun(config, command, role) {
  const required = command.role || "user";

  const rank = {
    guest: 0,
    user: 1,
    admin: 2,
    owner: 3
  };

  return (rank[role] || 0) >= (rank[required] || 0);
}

module.exports = {
  getRole,
  isWhitelisted,
  isBanned,
  canRun
};
    
