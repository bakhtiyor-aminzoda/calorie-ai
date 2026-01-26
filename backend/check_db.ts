
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Connecting to DB...');
    try {
        const requests = await prisma.paymentRequest.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: true
            }
        });

        console.log('Recent Payment Requests:');
        requests.forEach(r => {
            console.log(`ID: ${r.id}`);
            console.log(`User: ${r.user.firstName} (@${r.user.username}) [${r.userId}]`);
            console.log(`Status: ${r.status}`);
            console.log(`Created: ${r.createdAt}`);
            console.log('---');
        });

        if (requests.length === 0) {
            console.log("No payment requests found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
