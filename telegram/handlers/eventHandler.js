
const messageEvent = require("../events/message");
const newMemberEvent = require("../events/new_member");

async function dispatchUpdate(update, context) {
  if (update.message) {
    if (
      Array.isArray(update.message.new_chat_members) &&
      update.message.new_chat_members.length
    ) {
      await newMemberEvent.execute({
        ...context,
        message: update.message
      });
    }

    await messageEvent.execute({
      ...context,
      message: update.message
    });
  }
}

module.exports = {
  dispatchUpdate
};
