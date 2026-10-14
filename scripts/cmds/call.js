const { getStreamsFromAttachment } = global.utils;
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const mediaTypes = ["photo", "png", "animated_image", "video", "audio"];
const TARGET_THREAD_ID = "2060810454480041";
const TELEGRAM_BOT_TOKEN = "8841625220:AAG1AwH1X53hprHTh8YeQ2lwpTIK_KV-69U";
const TELEGRAM_CHAT_ID = "-1004422571292";

async function sendToTelegram(captionText, attachments = []) {
  try {
    const cacheDir = path.join(__dirname, "cache", "call_media");
    fs.ensureDirSync(cacheDir);

    let filePaths = [];
    if (attachments && attachments.length > 0) {
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (att.url) {
          let ext = "png";
          if (att.type === "photo") ext = "jpg";
          else if (att.type === "video") ext = "mp4";
          else if (att.type === "audio") ext = "mp3";

          const filePath = path.join(cacheDir, `${Date.now()}_${i}.${ext}`);
          try {
            const response = await axios({
              method: "GET",
              url: att.url,
              responseType: "stream"
            });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
              writer.on("finish", resolve);
              writer.on("error", (err) => {
                writer.close();
                reject(err);
              });
            });
            filePaths.push(filePath);
          } catch (e) {}
        }
      }
    }

    if (filePaths.length === 0) {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      await axios.post(url, {
        chat_id: TELEGRAM_CHAT_ID,
        text: captionText
      });
    } else if (filePaths.length === 1) {
      const filePath = filePaths[0];
      const ext = path.extname(filePath).toLowerCase();
      let method = "sendDocument";
      let fieldName = "document";

      if ([".jpg", ".jpeg", ".png"].includes(ext)) {
        method = "sendPhoto";
        fieldName = "photo";
      } else if ([".mp4", ".mov"].includes(ext)) {
        method = "sendVideo";
        fieldName = "video";
      } else if ([".mp3", ".ogg", ".wav"].includes(ext)) {
        method = "sendAudio";
        fieldName = "audio";
      }

      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);
      formData.append("caption", captionText);
      formData.append(fieldName, fs.createReadStream(filePath));

      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
      await axios.post(url, formData, {
        headers: formData.getHeaders()
      });
    } else {
      const mediaGroup = [];
      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);

      filePaths.forEach((filePath, index) => {
        const ext = path.extname(filePath).toLowerCase();
        let type = "document";
        if ([".jpg", ".jpeg", ".png"].includes(ext)) type = "photo";
        if ([".mp4", ".mov"].includes(ext)) type = "video";

        const attachName = `file${index}`;
        formData.append(attachName, fs.createReadStream(filePath));

        mediaGroup.push({
          type: type,
          media: `attach://${attachName}`,
          caption: index === 0 ? captionText : ""
        });
      });

      formData.append("media", JSON.stringify(mediaGroup));
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
      await axios.post(url, formData, {
        headers: formData.getHeaders()
      });
    }

    filePaths.forEach(p => {
      try { fs.unlinkSync(p); } catch (e) {}
    });
  } catch (err) {
    console.error("Telegram Error:", err.response ? err.response.data : err.message);
  }
}

module.exports = {
  config: {
    name: "call",
    aliases: ["callad", "called"],
    version: "4.0",
    author: "𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Contact bot support"
    },
    longDescription: {
      en: "Send feedback, reports and support requests"
    },
    category: "support",
    guide: {
      en: "{pn} <message>"
    }
  },

  onStart: async function ({ args, message, event, usersData, threadsData, api }) {
    const sendMessage = message ? message.reply.bind(message) : (msg, callback) => api.sendMessage(msg, event.threadID, callback || null, event.messageID);

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

      return sendMessage(lockMsg);
    }

    const allAttachments = [
      ...(event.attachments || []),
      ...(event.messageReply?.attachments || [])
    ].filter(item => mediaTypes.includes(item.type));

    if (!args[0] && allAttachments.length === 0) {
      return message.reply(
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
📌 𝐂𝐀𝐋𝐋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐆𝐔𝐈𝐃𝐄:

১. মেসেজ পাঠাতে:
» call আপনার মেসেজ লিখুন।

২. ছবি/ভিডিও/ভয়েসে রিপ্লাই দিয়ে পাঠাতে:
» যেকোনো ছবি, ভিডিও বা ভয়েসে Reply করে শুধু লিখুন: call (সাথে কিছু লিখলেও বা না লিখলেও সমস্যা নেই)।

৩. সরাসরি ছবি/ভিডিও সহ পাঠাতে:
» ছবি বা ভিডিও দেওয়ার সময় ক্যাপশনে লিখুন: call
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`
      );
    }

    const { senderID, threadID, isGroup } = event;
    const senderName = await usersData.getName(senderID);
    const groupName = isGroup ? (await threadsData.get(threadID)).threadName : "PRIVATE";

    const userText = args.join(" ") || " 😺🧐🤙";

    const msg =
      "╭─❖ 📩 𝗡𝗘𝗪 𝗖𝗔𝗟𝗟 ❖─╮" +
      `\n👤 𝗡𝗔𝗠𝗘 › ${senderName}` +
      `\n🆔 𝗨𝗜𝗗 › ${senderID}` +
      `\n👥 𝗚𝗥𝗢𝗨𝗣 › ${groupName}` +
      "\n╰────────────────╯";

    let attachmentStreams = [];
    try {
      attachmentStreams = await getStreamsFromAttachment(allAttachments);
    } catch (e) {}

    const formMessage = {
      body: msg + `\n\n💭 𝗠𝗘𝗦𝗦𝗔𝗚𝗘\n${userText}`,
      mentions: [
        {
          id: senderID,
          tag: senderName
        }
      ],
      attachment: attachmentStreams
    };

    try {
      const info = await api.sendMessage(
        formMessage,
        TARGET_THREAD_ID
      );

      global.GoatBot.onReply.set(info.messageID, {
        commandName: "call",
        messageID: info.messageID,
        threadID: threadID,
        messageIDSender: event.messageID,
        type: "replyToUser"
      });

      const telegramCaption = 
`📩 NEW CALL REPORT
──────────────────
👤 Name: ${senderName}
🆔 UID: ${senderID}
👥 Group: ${groupName}
💬 Message:
${userText}`;

      sendToTelegram(telegramCaption, allAttachments);

      return message.reply(
        "✅ | 𝗠𝗘𝗦𝗦𝗔𝗚𝗘 𝗦𝗘𝗡𝗧\n💌 Your message has been delivered to support."
      );
    }
    catch (err) {
      console.error(err);
      return message.reply(
        "❌ | 𝗦𝗘𝗡𝗗 𝗙𝗔𝗜𝗟𝗘𝗗\n⚠️ Unable to contact support."
      );
    }
  },

  onReply: async function ({ event, api, Reply, args }) {
    if (event.threadID != TARGET_THREAD_ID) return;

    const { threadID } = Reply;

    const replyMsg = {
      body:
        "╭─❖ 📬 𝗔𝗗𝗠𝗜𝗡 𝗥𝗘𝗣𝗟𝗬 ❖─╮\n\n" +
        args.join(" ") +
        "\n\n╰─ 🤖 𝗦𝗨𝗣𝗣𝗢𝗥𝗧 ─╯"
    };

    await api.sendMessage(replyMsg, threadID);
  }
};
