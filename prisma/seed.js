const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = [
        { username: 'admin', password: '123', role: 'ADMIN' },
        { username: 'finance', password: '123', role: 'FINANCE' },
        { username: 'staff', password: '123', role: 'STAFF' },
    ];

    for (const user of users) {
        const upsertUser = await prisma.user.upsert({
            where: { username: user.username },
            update: {},
            create: user,
        });
        console.log(`User created: ${upsertUser.username}`);
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
