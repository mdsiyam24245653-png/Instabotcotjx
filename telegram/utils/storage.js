
const fs = require("fs");
const path = require("path");

const databaseDir = path.join(__dirname, "..", "database");

function readJson(fileName, fallback) {
  const filePath = path.join(databaseDir, fileName);

  try {
    if (!fs.existsSync(filePath)) {
      writeJson(fileName, fallback);
      return fallback;
    }

    return JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );
  } catch (error) {
    console.error(
      `[TELEGRAM] Cannot read ${fileName}: ${error.message}`
    );

    return fallback;
  }
}

function writeJson(fileName, value) {
  fs.mkdirSync(databaseDir, {
    recursive: true
  });

  const filePath = path.join(databaseDir, fileName);
  const tempPath = `${filePath}.tmp`;

  fs.writeFileSync(
    tempPath,
    JSON.stringify(value, null, 2) + "\n",
    "utf8"
  );

  fs.renameSync(tempPath, filePath);
}

module.exports = {
  readJson,
  writeJson
};
