const prisma = require('../database/prisma');
const { parseWhatsappJobMessage } = require('../services/whatsappMonitor');

async function importWhatsappHandler(req, res) {
    try {
        const { messageText } = req.body;
        
        if (!messageText) {
            return res.status(400).json({ success: false, error: "messageText is required" });
        }

        const parsedJob = parseWhatsappJobMessage(messageText);

        if (!parsedJob) {
            return res.json({ success: false, message: "Could not parse message as a valid job or failed filters." });
        }

        // Check if exists
        const exists = await prisma.job.findUnique({
            where: { hash: parsedJob.hash }
        });

        if (exists) {
            return res.json({ success: true, message: "Job already exists in database.", inserted: false });
        }

        // Needs a default "WhatsApp Channel" company or we dynamically create one
        let company = await prisma.company.findUnique({
            where: { name: parsedJob.company }
        });

        if (!company) {
            company = await prisma.company.create({
                data: {
                    name: parsedJob.company,
                    ats: "unknown",
                    enabled: true
                }
            });
        }

        await prisma.job.create({
            data: {
                hash: parsedJob.hash,
                company_id: company.id,
                title: parsedJob.title,
                location: parsedJob.location,
                url: parsedJob.url,
                department: parsedJob.department,
                employment_type: parsedJob.employment_type,
                experience: parsedJob.experience,
                source: parsedJob.source,
                ats: parsedJob.ats,
                posted: false
            }
        });

        res.json({ success: true, message: "Job successfully imported from WhatsApp.", inserted: true });
    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { importWhatsappHandler };
