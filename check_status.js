const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const statuses = await prisma.soItem.groupBy({
        by: ['existenceStatus'],
        _count: {
            existenceStatus: true,
        },
    });
    console.log('Distinct existenceStatus values:', statuses);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
