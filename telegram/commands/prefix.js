
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "prefix",
  description: "বটের Prefix দেখুন বা পরিবর্তন করুন",
  role: "admin",
  async execute({ args, config, reply }) {
    if (!args[0]) {
      return reply(`বর্তমান Prefix: ${config.prefix}`);
    }

    if (args[0].length > 3 || /\s/.test(args[0])) {
      return reply("Prefix ১ থেকে ৩ অক্ষরের হতে হবে এবং Space দেওয়া যাবে না।");
    }

    config.prefix = args[0];

    const configPath = path.join(__dirname, "..", "config.json");

    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2) + "\n"
    );

    await reply(`✅ Prefix পরিবর্তন হয়েছে: ${config.prefix}`);
  }
};
