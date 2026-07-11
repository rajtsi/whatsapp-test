function normalizeJob(jobData) {
    return {
        title: jobData.title || "",
        location: jobData.location || "",
        url: jobData.url || "",
        department: jobData.department || "",
        employment_type: jobData.employment_type || "Full-time",
        experience: jobData.experience || "",
    };
}

module.exports = { normalizeJob };
