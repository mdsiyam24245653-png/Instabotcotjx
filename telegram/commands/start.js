
module.exports = {
  name: "start",
  aliases: ["শুরু"],
  description: "বট চালু ও পরিচিতি",
  role: "user",
  async execute({ reply, from }) {
    await reply(`হ্যালো ${from.first_name || "বন্ধু"}! 👋
আমি Telegram Bot। /help লিখে কমান্ডগুলো দেখো।`);
  }
};
