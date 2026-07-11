const { generateHash } = require('./duplicate');
const { isAllowedLocation } = require('../filters/locationFilter');
const { isTechRole } = require('../filters/roleFilter');
const { normalizeJob } = require('./normalizeJob');

function parseWhatsappJobMessage(messageText) {
    // Basic regex extraction for standard formats
    // Example: "🏢 Company: Postman\n💼 Role: Backend Engineer\n📍 Location: Bangalore, India\n🔗 Apply: https://..."
    
    const companyMatch = messageText.match(/Company[:\-\s]+([^\n]+)/i);
    const roleMatch = messageText.match(/Role[:\-\s]+([^\n]+)/i) || messageText.match(/Title[:\-\s]+([^\n]+)/i);
    const locationMatch = messageText.match(/Location[:\-\s]+([^\n]+)/i);
    const applyMatch = messageText.match(/Apply(?: Here)?[:\-\s]+([^\n\s]+)/i) || messageText.match(/https?:\/\/[^\s]+/i);

    if (!companyMatch || !roleMatch || !applyMatch) {
        return null; // Not enough confidence this is a valid job post
    }

    const company = companyMatch[1].trim();
    const title = roleMatch[1].trim();
    const location = locationMatch ? locationMatch[1].trim() : "Unknown";
    const url = applyMatch[1].trim(); // First URL found

    // Apply filters
    if (!isAllowedLocation(location) || !isTechRole(title)) {
        return null;
    }

    const normalized = normalizeJob({ title, location, url });

    return {
        ...normalized,
        company,
        hash: generateHash(company, normalized.title, normalized.location),
        ats: "unknown",
        source: "whatsapp"
    };
}

module.exports = { parseWhatsappJobMessage };
