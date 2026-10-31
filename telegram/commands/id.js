
module.exports = {
  name: "id",
  aliases: ["myid"],
  description: "নিজের Telegram ID এবং Chat ID দেখুন",
  role: "user",
  async execute({ reply, from, chat }) {
    await reply(`👤 User ID: ${from.id}\n💬 Chat ID: ${chat.id}`);
  }
};
