if (!global.siyamTextCooldown) {
    global.siyamTextCooldown = new Map();
}

if (!global.__siyamCooldownCleaner) {
    global.__siyamCooldownCleaner = setInterval(() => {
        const now = Date.now();
        for (const [key, timestamp] of global.siyamTextCooldown.entries()) {
            if (now - timestamp > 10 * 60 * 1000) {
                global.siyamTextCooldown.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

const getRandomDelay = (min = 1800, max = 3000) => {
    return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
};

module.exports = {
    config: {
        name: "copy",
        version: "8.0.0",
        author: "𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍",
        role: 0,
        countDown: 5,
        category: "UTILITY",
        shortDescription: "Multiplies text safely with smart per-text cooldown and anti-ban protection",
        longDescription: "এডমিনের জন্য আনলিমিটেড এবং সাধারণ ইউজারের জন্য একই টেক্সটে ৩ মিনিটের কুলডাউন সিস্টেম।",
        guide: "{p}copy [text/emoji] [count]\nExample: {p}copy 🔪 5000"
    },

    onStart: async function ({ api, event, args, message }) {
        const { threadID, messageID, senderID } = event;

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

        try {
            if (args.length < 2) {
                const usageMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» ⚠️ ব্যবহার পদ্ধতি:
» 📝 copy [টেক্সট/ইমোজি] [সংখ্যা]
───────────────
» 🤪 উদাহরণ:
» 🙄 copy আমার বস সিয়াম 70
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;
                return api.sendMessage(usageMsg, threadID, messageID);
            }

            let count = NaN;
            let targetText = "";

            if (!isNaN(parseInt(args[args.length - 1]))) {
                count = parseInt(args[args.length - 1]);
                targetText = args.slice(0, -1).join(" ");
            } else if (!isNaN(parseInt(args[0]))) {
                count = parseInt(args[0]);
                targetText = args.slice(1).join(" ");
            }

            if (isNaN(count) || count <= 0) {
                const invalidCountMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» ❌ ভুল সংখ্যা!
» 🔢 একটি সঠিক সংখ্যা দিন
» ✅ (যেমন: 1 থেকে 10,000)।
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;
                return api.sendMessage(invalidCountMsg, threadID, messageID);
            }

            if (!targetText) {
                const noTextMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» ❌ কোনো টেক্সট বা 
» ⚔️ ইমোজি দিন।
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;
                return api.sendMessage(noTextMsg, threadID, messageID);
            }

            const botAdmins = global.GoatBot?.config?.adminBot || global.GoatBot?.config?.ADMINBOT || global.config?.ADMINBOT || [];
            const isBotAdmin = Array.isArray(botAdmins) && botAdmins.includes(senderID);

            if (!isBotAdmin && count > 70) {
                const userWarningMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» 🫡 আগে লেবেলে আয় 
» 😹 সর্বোচ্চ 70 বার কপি 
» 🏟️ করতে পারবেন।
» 📌 আপনার সংখ্যা: ${count}
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;
                return api.sendMessage(userWarningMsg, threadID, messageID);
            }

            if (isBotAdmin && count > 10000) {
                const adminWarningMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» ⚠️ বট এডমিনদের জন্য 
» ✅ সর্বোচ্চ লিমিট 10k!
» 📌 আপনার সংখ্যা: ${count}
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝐁𝐎𝗧`;
                return api.sendMessage(adminWarningMsg, threadID, messageID);
            }

            if (!isBotAdmin && targetText.length > 70) {
                const limitMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» ⚠️ 𝗟𝗜𝗠𝗜𝗧 𝗪𝗔𝗥𝗡𝗜𝗡𝗚!
» ❌ তুই গরিব সর্বোচ্চ 𝟳𝟬 অক্ষর
» 😏 ব্যবহার করতে পারবি।
» 📝 আপনার বর্তমান অক্ষর
» 🖥️  সংখ্যা: ${targetText.length}
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;
                return api.sendMessage(limitMsg, threadID, messageID);
            }

            if (!isBotAdmin) {
                const currentTime = Date.now();
                const cooldownTime = 3 * 60 * 1000; 
                const cooldownKey = `${senderID}_${Buffer.from(targetText).toString("hex").slice(0, 30)}`;

                if (global.siyamTextCooldown.has(cooldownKey)) {
                    const lastUsed = global.siyamTextCooldown.get(cooldownKey);
                    if (currentTime - lastUsed < cooldownTime) {
                        const remainingTime = Math.ceil((cooldownTime - (currentTime - lastUsed)) / 1000);
                        const cooldownMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» 🚫 𝗗𝘂𝗽𝗹𝗶𝗰𝗮𝘁𝗲 𝗠𝗲𝘀𝘀𝗮𝗴𝗲
» ⏳ 𝗧𝗿𝘆 𝗔𝗴𝗮𝗶𝗻 𝗜𝗻 
» 📉 ${remainingTime}
» 😊 সেকেন্ড।
» 💎 অন্য কোনো টেক্সট ব্যবহার
» ✅ করুন।
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;
                        return api.sendMessage(cooldownMsg, threadID, messageID);
                    }
                }

                global.siyamTextCooldown.set(cooldownKey, currentTime);
            }

            let repeatedResult = Array(count).fill(targetText).join(" ");
            const MAX_LENGTH = 1900; 
            let messageChunks = [];

            while (repeatedResult.length > 0) {
                if (repeatedResult.length > MAX_LENGTH) {
                    let chunk = repeatedResult.substring(0, MAX_LENGTH);
                    messageChunks.push(chunk);
                    repeatedResult = repeatedResult.substring(MAX_LENGTH);
                } else {
                    messageChunks.push(repeatedResult);
                    repeatedResult = "";
                }
            }

            for (let i = 0; i < messageChunks.length; i++) {
                await api.sendMessage(messageChunks[i], threadID);
                if (messageChunks.length > 1 && i < messageChunks.length - 1) {
                    await getRandomDelay(1800, 3000); 
                }
            }

        } catch (err) {
            console.error("Copy Command Error:", err);
            const errorMsg = 
`» 👑 𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍 👑
───────────────
» ❌ অভ্যন্তরীণ সমস্যা!
» 💥 ফাইল ক্রাশ এড়ানো
» 🎀  হয়েছে: ${err.message}
───────────────
» 🧚‍♀️ ‿𝗡𝗜𝗝𝗛𝗨𝗠 𝗖𝗛𝗔𝗧𝗕𝗢𝗧`;
            api.sendMessage(errorMsg, threadID, messageID);
        }
    আপনার
