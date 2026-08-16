const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const scans = await prisma.scan.findMany({ orderBy: { createdAt: 'desc' }, take: 2 });
  console.log(JSON.stringify(scans, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
