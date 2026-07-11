const crypto = require('crypto');

function generateHash(company, title, location) {
    const input = `${company}|${title}|${location}`.toLowerCase().trim();
    return crypto.createHash('sha256').update(input).digest('hex');
}

module.exports = { generateHash };
