
// Using the project's prisma instance
const { prisma } = require('./lib/prisma');

async function main() {
  try {
    console.log("Checking MarketingAd...");
    const count = await prisma.marketingAd.count();
    console.log("MarketingAd count:", count);
    
    console.log("Checking aggregation...");
    const agg = await prisma.marketingAd.aggregate({
      _sum: { spent: true }
    });
    console.log("Aggregation result:", agg);
    
    console.log("SUCCESS");
  } catch (e) {
    console.error("FAILURE:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
