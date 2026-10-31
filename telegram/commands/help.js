
const { commandRegistry } = require("../handlers/commandHandler");

module.exports = {
  name: "help",
  aliases: ["হেল্প"],
  description: "কমান্ডের তালিকা",
  role: "user",
  async execute({ reply, role, config }) {
    const unique = [...new Set(commandRegistry.values())]
      .filter((command) => {
        const rank = { user: 1, admin: 2, owner: 3 };
        return (rank[role] || 0) >= (rank[command.role || "user"] || 1);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const prefix = String(config.prefix || ",");
    const lines = unique.map((command) =>
      `${prefix}${command.name} — ${command.description || "কোনো বিবরণ নেই"}`
    );

    await reply(
      "📚 কমান্ড তালিকা\n\n" +
      (lines.join("\n") || "কোনো কমান্ড নেই") +
      "\n\nTelegram slash format-ও কাজ করবে: /help"
    );
  }
};
      
