const axios = require('axios');
const { normalizeJob } = require('../../services/normalizeJob');
const { generateHash } = require('../../services/duplicate');

async function collectGreenhouseJobs(companyName, boardToken) {
    try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs`;
        const response = await axios.get(url, { timeout: 10000 });
        
        if (!response.data || !response.data.jobs) return [];

        return response.data.jobs.map(job => {
            const normalized = normalizeJob({
                title: job.title,
                location: job.location?.name,
                url: job.absolute_url,
                department: job.departments?.map(d => d.name).join(', ')
            });
            
            return {
                ...normalized,
                company: companyName,
                hash: generateHash(companyName, normalized.title, normalized.location),
                ats: "greenhouse",
                source: "api"
            };
        });
    } catch (error) {
        console.error(`Failed to collect Greenhouse jobs for ${companyName}:`, error.message);
        return [];
    }
}

module.exports = { collectGreenhouseJobs };
