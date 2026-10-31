
module.exports = {
  name: "new_member",

  async execute({ api, message }) {
    const names = (message.new_chat_members || [])
      .filter((member) => !member.is_bot)
      .map((member) =>
        [member.first_name, member.last_name]
          .filter(Boolean)
          .join(" ")
      )
      .filter(Boolean);

    if (!names.length) return;

    await api.sendMessage(
      message.chat.id,
      `স্বাগতম ${names.join(", ")}! 👋`,
      {
        reply_to_message_id: message.message_id
      }
    );
  }
};
