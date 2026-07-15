const allowedRoles = [
    "software engineer", "backend", "frontend", "full stack", "fullstack", "sde",
    "data engineer", "data scientist", "data analyst", "ml engineer", "ai engineer",
    "platform", "devops", "sre", "android", "ios", "qa", "security", "cloud engineer"
];

const rejectedRoles = [
    "sales", "marketing", "finance", "hr", "legal", 
    "solutions engineer", "customer success", "account executive",
    "senior", "sr", "staff", "principal", "lead", "head", "manager", "director", "vp"
];

function isTechRole(title = "") {
    const titleLower = title.toLowerCase();
    
    // Check rejections first
    if (rejectedRoles.some(r => titleLower.includes(r))) {
        return false;
    }
    
    // Check inclusions
    return allowedRoles.some(r => titleLower.includes(r));
}

module.exports = { isTechRole };
