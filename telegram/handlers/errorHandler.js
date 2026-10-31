
function logTelegramError(context, error) {
  const label = context ? ` (${context})` : "";

  console.error(
    `[TELEGRAM] Error${label}:`,
    error?.response?.description ||
    error?.message ||
    error
  );
}

module.exports = {
  logTelegramError
};
