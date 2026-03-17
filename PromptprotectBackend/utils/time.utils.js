const moment = require("moment-timezone");

/**
 * Formats an epoch timestamp (milliseconds) to a readable string based on timezone.
 * @param {number} epoch - Epoch timestamp in ms.
 * @param {string} timezone - Target timezone (e.g., 'Asia/Kolkata').
 * @param {string} format - Moment format string.
 * @returns {string} - Formatted date string.
 */
function formatWithTimezone(epoch, timezone = "UTC", format = "MM/DD/YYYY hh:mm A") {
    if (!epoch) return "N/A";
    return moment(epoch).tz(timezone).format(format);
}

module.exports = {
    formatWithTimezone
};
