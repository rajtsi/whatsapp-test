const prisma = require('../database/prisma');
const client = require('../whatsapp/client');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function postJobsHandler(req, res) {
    const channelJid = req.body.channelJid || process.env.JOB_CHANNEL_JID; 

    if (!channelJid) {
        return res.status(400).json({ success: false, error: "channelJid must be provided in the request body" });
    }

    if (!client.isClientReady()) {
        return res.status(503).json({ success: false, error: "WhatsApp client is not ready yet." });
    }

    // Fire and forget response for cron-job.org (prevents 30s timeout)
    res.json({ success: true, message: "Job posting started in background." });

    const limit = req.body.limit || 15; // Increased default to 15 so it clears backlogs

    try {
        // Fetch up to limit unposted jobs, oldest first
        const jobs = await prisma.job.findMany({
            where: { posted: false },
            orderBy: { created_at: 'asc' },
            take: limit,
            include: { company: true }
        });

        if (jobs.length === 0) {
            console.log("[Background Task] No new jobs to post.");
            return;
        }

        const postedIds = [];
        const jobIds = jobs.map(j => j.id);

        // Lock jobs immediately so parallel cron runs don't grab the exact same jobs!
        await prisma.job.updateMany({
            where: { id: { in: jobIds } },
            data: { posted: true, posted_at: new Date() }
        });

        for (const job of jobs) {
            const hashtags = `#${job.title.replace(/[^a-zA-Z0-9]/g, '')} #${job.company?.name ? job.company.name.replace(/[^a-zA-Z0-9]/g, '') : 'Job'}`;
            const message = `🚀 *New Job Opening*\n\n🏢 *Company*\n${job.company?.name || job.company_id}\n\n💼 *Role*\n${job.title}\n\n📍 *Location*\n${job.location}\n\n🔗 *Apply*\n${job.url}\n\n${hashtags}\n\n---\n*Best Career Opportunities (Engineering)*\nAutomated daily job alerts via web scraping. Join and share with friends:\nhttps://whatsapp.com/channel/0029Varon8PEgGfIfeKhl00v`;
            
            let success = false;
            let retries = 3;
            
            while (!success && retries > 0) {
                try {
                    // Make sure client is ready before trying
                    if (!client.isClientReady()) {
                        await sleep(25000);
                        continue;
                    }
                    await client.sendMessage(channelJid, message);
                    success = true;
                    postedIds.push(job.id);
                } catch (err) {
                    console.error(`[Background Task] Failed to send job to WhatsApp (Retries left: ${retries - 1}):`, err.message);
                    retries--;
                    await sleep(25000); // Wait 25s before retrying
                }
            }

            if (!success) {
                // Revert this specific job so it gets picked up next time
                await prisma.job.update({ where: { id: job.id }, data: { posted: false, posted_at: null } });
            } else if (postedIds.length < jobs.length) {
                // Wait 30 seconds before sending the next one to avoid spam bans
                await sleep(30000);
            }
        }

        console.log(`[Background Task] Posted ${postedIds.length} jobs.`);
    } catch (error) {
        console.error("[Background Task] Post Error:", error);
    }
}

module.exports = { postJobsHandler };
