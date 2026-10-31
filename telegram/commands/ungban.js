
module.exports = {
  name: "ungban",
  description: "Global ban তুলে দিন",
  role: "admin",

  async execute({ args, reply, database, saveBans }) {
    const targetId = args[0];

    if (!targetId || !/^\d+$/.test(String(targetId))) {
      return reply("ব্যবহার: /ungban TelegramUserID");
    }

    const before = (database.users || []).length;

    database.users = (database.users || []).filter(
      (item) => String(item.id) !== String(targetId)
    );

    if (database.users.length === before) {
      return reply("এই User Global Ban তালিকায় নেই।");
    }

    saveBans(database);

    await reply(
      `✅ User ${targetId}-এর Global Ban তুলে দেওয়া হয়েছে।`
    );
  }
};
