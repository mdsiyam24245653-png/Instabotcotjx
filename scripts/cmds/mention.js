const axios = require("axios");

if (!global.activeMentions) {
  global.activeMentions = new Map();
}

module.exports = {
  config: {
    name: "mention",
    version: "3.1.0",
    role: 2,
    author: "𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍",
    shortDescription: "Mention someone or everyone multiple times with stop option",
    longDescription: "Sends multiple tag notifications using real Facebook profile names with option to turn off.",
    category: "group",
    guide: "{p}mention [count] [@mention/everyone/reply/UID] OR {p}mention off",
    countDown: 3
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;

    if (args[0] && args[0].toLowerCase() === "off") {
      if (global.activeMentions.has(threadID)) {
        global.activeMentions.set(threadID, false);
        return message.reply("✅");
      } else {
        return message.reply("🫏💨");
      }
    }

    let count = 1;
    let target = null;
    let remainingArgs = [...args];

    if (remainingArgs.length > 0 && !isNaN(remainingArgs[0]) && remainingArgs[0].trim() !== "") {
      count = parseInt(remainingArgs[0]);
      remainingArgs = remainingArgs.slice(1);

      const maxCount = 100;
      if (count < 1) count = 1;
      if (count > maxCount) {
        count = maxCount;
        message.reply(`⚠️ সর্বোচ্চ ${maxCount} বার মেনশন করা যাবে!`);
      }
    }

    if (event.type === "message_reply") {
      const replyID = event.messageReply.senderID;
      try {
        const userInfo = await api.getUserInfo(replyID);
        const realName = userInfo[replyID]?.name || "Facebook User";
        target = { type: "user", id: replyID, name: realName };
      } catch (e) {
        target = { type: "user", id: replyID, name: "Facebook User" };
      }
    } else if (Object.keys(event.mentions || {}).length > 0) {
      const targetID = Object.keys(event.mentions)[0];
      try {
        const userInfo = await api.getUserInfo(targetID);
        const realName = userInfo[targetID]?.name || "Facebook User";
        target = { type: "user", id: targetID, name: realName };
      } catch (e) {
        target = { type: "user", id: targetID, name: "Facebook User" };
      }
    } else if (remainingArgs.join(" ").toLowerCase().includes("everyone")) {
      target = { type: "everyone" };
    } else if (remainingArgs.length > 0 && /^\d+$/.test(remainingArgs[0])) {
      const uid = remainingArgs[0];
      try {
        const userInfo = await api.getUserInfo(uid);
        const realName = userInfo[uid]?.name || "Facebook User";
        target = { type: "user", id: uid, name: realName };
      } catch (e) {
        target = null;
      }
    }

    if (!target) {
      return message.reply("❌ ইউজার ডিটেক্ট করা যায়নি!\nউদাহরণ: {p}mention 5 @user");
    }

    global.activeMentions.set(threadID, true);

    if (target.type === "everyone") {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const participants = threadInfo.participantIDs.filter(id => id !== senderID);

        if (participants.length === 0) {
          global.activeMentions.delete(threadID);
          return message.reply("❌ গ্রুপে মেনশন করার মতো কেউ নেই!");
        }

        const userInfos = await api.getUserInfo(participants);
        const mentionMessages = [
          "📢 @everyone\nসবাই চিপা থেকে বের হও🐸",
          "👥 @everyone\n🐸 চিপায় অনেক মশা আছে"
        ];

        for (let i = 0; i < count; i++) {
          if (global.activeMentions.get(threadID) === false) {
            global.activeMentions.delete(threadID);
            break;
          }

          try {
            const mentions = participants.map(id => ({
              tag: userInfos[id]?.name || "Facebook User",
              id: id
            }));
            const messageBody = mentionMessages[Math.floor(Math.random() * mentionMessages.length)];

            await api.sendMessage({ body: messageBody, mentions: mentions }, threadID);

            if (i < count - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.error(error);
          }
        }
        global.activeMentions.delete(threadID);
      } catch (error) {
        global.activeMentions.delete(threadID);
        return message.reply("❌ গ্রুপ ইনফো পেতে সমস্যা হয়েছে!");
      }
    } else {
      const mentionMessages = [
        `@${target.name}\nচিপা থেকে বের হও🐸🔪`,
        `@${target.name} সিয়াম বস ডাকছে🏃‍♂️`
      ];

      for (let i = 0; i < count; i++) {
        if (global.activeMentions.get(threadID) === false) {
          global.activeMentions.delete(threadID);
          break;
        }

        try {
          const messageBody = mentionMessages[Math.floor(Math.random() * mentionMessages.length)];
          await api.sendMessage({
            body: messageBody,
            mentions: [{ tag: target.name, id: target.id }]
          }, threadID);

          if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          console.error(error);
        }
      }
      global.activeMentions.delete(threadID);
    }
  }
};
