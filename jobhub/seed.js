const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const companies = [
  { name: 'Airbnb', board_token: 'airbnb' },
  { name: 'Dropbox', board_token: 'dropbox' },
  { name: 'Pinterest', board_token: 'pinterest' },
  { name: 'Coinbase', board_token: 'coinbase' },
  { name: 'Figma', board_token: 'figma' },
  { name: 'Notion', board_token: 'notion' },
  { name: 'Postman', board_token: 'postman' },
  { name: 'Discord', board_token: 'discord' },
  { name: 'Twilio', board_token: 'twilio' },
  { name: 'Cloudflare', board_token: 'cloudflare' },
  { name: 'MongoDB', board_token: 'mongodb' },
  { name: 'Stripe', board_token: 'stripe' },
  { name: 'Plaid', board_token: 'plaid' },
  { name: 'Datadog', board_token: 'datadog' },
  { name: 'AlphaGrep Securities', board_token: 'alphagrepsecurities' },
  { name: 'Leap Work', board_token: 'leapwork' },


];

async function main() {
  console.log('Seeding top tech companies to database...');
  for (const c of companies) {
    await prisma.company.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, ats: 'greenhouse', board_token: c.board_token, enabled: true },
    });
    console.log('Added:', c.name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
