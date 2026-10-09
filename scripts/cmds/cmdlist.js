module.exports = {
  config: {
    name: "cmdlist",
    version: "2.0.0",
    author: "𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍",
    role: 0,
    countDown: 5,
    category: "system",
    shortDescription: "Shows list of all commands with author names safely",
    longDescription: "Displays all loaded bot commands with loading status and error handling.",
    guide: "{p}cmdlist"
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID } = event;

    const LOCKED_AUTHOR = "𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍";

    if (module.exports.config.author !== LOCKED_AUTHOR) {
      const lockMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» ⛔ 𝗙𝗜𝗟𝗘 𝗟𝗢𝗖𝗞𝗘𝗗
» ❌ সিয়াম ভাই এর নাম 
» 🤦 পরিবর্তন করা হয়েছে!
» ⚠️ এই কমান্ডটি নষ্ট করা হলো।
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;

      return api.sendMessage(lockMsg, threadID, messageID);
    }

    let loadingMsgInfo = null;

    try {
      loadingMsgInfo = await message.reply("⏳ **কমান্ড লিস্ট লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...**");

      const commands = global.GoatBot?.commands || new Map();

      if (!commands || commands.size === 0) {
        if (loadingMsgInfo && loadingMsgInfo.messageID) {
          await api.unsendMessage(loadingMsgInfo.messageID).catch(() => {});
        }
        return message.reply("❌ কোনো কমান্ড খুঁজে পাওয়া যায়নি!");
      }

      let listText = "";
      let index = 1;

      commands.forEach((cmd, key) => {
        const cmdName = cmd.config?.name || key || "Unknown";
        const authorName = cmd.config?.author || "Unknown Author";

        listText += `» 🎰 ${index++}. ${cmdName}\n» 👑 Author: ${authorName}\n───────────────\n`;
      });

      const headerText = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» 📊 𝗧𝗢𝗧𝗔𝗟 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 : ${commands.size}
───────────────\n`;

      const footerText = `\n» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;

      const MAX_LENGTH = 1800;
      const fullText = headerText + listText + footerText;

      let chunks = [];
      let tempText = headerText;

      commands.forEach((cmd, key) => {
        const cmdName = cmd.config?.name || key || "Unknown";
        const authorName = cmd.config?.author || "Unknown Author";
        const itemText = `» 🎰 ${cmdName}\n» 👑 Author: ${authorName}\n───────────────\n`;

        if ((tempText + itemText + footerText).length > MAX_LENGTH) {
          tempText += footerText;
          chunks.push(tempText);
          tempText = headerText + itemText;
        } else {
          tempText += itemText;
        }
      });

      if (tempText !== headerText) {
        tempText += footerText;
        chunks.push(tempText);
      }

      if (loadingMsgInfo && loadingMsgInfo.messageID) {
        await api.unsendMessage(loadingMsgInfo.messageID).catch(() => {});
      }

      for (let i = 0; i < chunks.length; i++) {
        await api.sendMessage(chunks[i], threadID);
        if (chunks.length > 1 && i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

    } catch (err) {
      if (loadingMsgInfo && loadingMsgInfo.messageID) {
        await api.unsendMessage(loadingMsgInfo.messageID).catch(() => {});
      }

      const errorMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» ❌ সমস্যা দেখা দিয়েছে!
» 💥 এরর মেসেজ: ${err.message || "Unknown Error"}
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;

      return api.sendMessage(errorMsg, threadID, messageID);
    }
  }
};
