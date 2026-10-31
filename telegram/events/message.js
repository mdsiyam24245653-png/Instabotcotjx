
const { handleCommand } = require("../handlers/commandHandler");

module.exports = {
  name: "message",

  async execute(context) {
    if (!context.message?.text) return;

    await handleCommand(
      context,
      context.config,
      context.api,
      context.botInfo
    );
  }
};
