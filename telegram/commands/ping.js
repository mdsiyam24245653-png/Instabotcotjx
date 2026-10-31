
module.exports = {
  name: "ping",
  description: "বটের সাড়া পরীক্ষা",
  role: "user",
  async execute({ reply }) {
    await reply("🏓 Pong! Telegram bot is online.");
  }
};
