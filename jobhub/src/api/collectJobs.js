const prisma = require('../database/prisma');
const { collectGreenhouseJobs } = require('../collectors/greenhouse');
const { isAllowedLocation } = require('../filters/locationFilter');
const { isTechRole } = require('../filters/roleFilter');

async function collectJobsHandler(req, res) {
    // Fire and forget response for cron-job.org (prevents 30s timeout)
    res.json({ success: true, message: "Job collection started in background." });

    try {
        // Fetch enabled companies
        const companies = await prisma.company.findMany({
            where: { enabled: true, ats: "greenhouse" }
        });

        // Cleanup: Delete jobs older than 7 days to save Neon DB space
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const deletedStats = await prisma.job.deleteMany({
            where: {
                created_at: { lt: sevenDaysAgo }
            }
        });
        console.log(`Cleaned up ${deletedStats.count} old jobs.`);

        let totalInserted = 0;

        for (const company of companies) {
            if (!company.board_token) continue;

            const jobs = await collectGreenhouseJobs(company.name, company.board_token);
            
            for (const job of jobs) {
                if (!isAllowedLocation(job.location) || !isTechRole(job.title)) {
                    continue;
                }

                // Check duplicate using hash
                const exists = await prisma.job.findUnique({
                    where: { hash: job.hash }
                });

                if (!exists) {
                    await prisma.job.create({
                        data: {
                            hash: job.hash,
                            company_id: company.id,
                            title: job.title,
                            location: job.location,
                            url: job.url,
                            department: job.department,
                            employment_type: job.employment_type,
                            experience: job.experience,
                            source: job.source,
                            ats: job.ats,
                            posted: false
                        }
                    });
                    totalInserted++;
                }
            }

            // Update last_checked
            await prisma.company.update({
                where: { id: company.id },
                data: { last_checked: new Date() }
            });
        }

        console.log(`[Background Task] Collected ${totalInserted} new jobs.`);
    } catch (error) {
        console.error("[Background Task] Collect Error:", error);
    }
}

module.exports = { collectJobsHandler };
