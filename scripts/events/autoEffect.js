module.exports = {
  config: {
    name: "autoEffect",
    version: "1.0.0",
    author: "𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍",
    category: "events"
  },

  onStart: async function ({ api, event }) {
    const originalSendMessage = api.sendMessage;

    api.sendMessage = function (data, threadID, callback, messageID) {
      if (typeof data === "string") {
        data = {
          body: data,
          messageEffectID: "3612190052327780"
        };
      } else if (typeof data === "object" && data !== null) {
        if (!data.messageEffectID) {
          data.messageEffectID = "3612190052327780";
        }
      }

      return originalSendMessage.call(api, data, threadID, callback, messageID);
    };
  }
};
