const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
    datasources: {
        db: {
            // เพิ่ม connection_limit=1 และ pool_timeout เพื่อแก้ปัญหาถูกตัดการเชื่อมต่อ (Server has closed the connection)
            url: "mysql://root:UoaxjOEXQdJmYkZqEtslIdEwWvCgXnQk@viaduct.proxy.rlwy.net:19507/railway?connection_limit=1&connect_timeout=30"
        }
    }
});

async function main() {
    console.log("Connecting to Railway DB with connection_limit=1...");
    try {
        const ownerHash = bcrypt.hashSync('owner1234', 12);
        const staffHash = bcrypt.hashSync('staff1234', 12);
        const managerHash = bcrypt.hashSync('manager1234', 12);

        console.log("Upserting OWNER...");
        await prisma.user.upsert({
            where: { username: 'owner' },
            update: { passwordHash: ownerHash, isActive: true },
            create: { username: 'owner', name: 'เจ้าของร้าน', passwordHash: ownerHash, role: 'OWNER', isActive: true }
        });

        console.log("Upserting KITCHEN...");
        await prisma.user.upsert({
            where: { username: 'kitchen' },
            update: { passwordHash: staffHash, isActive: true },
            create: { username: 'kitchen', name: 'ครัว', passwordHash: staffHash, role: 'KITCHEN', isActive: true }
        });

        console.log("Upserting MANAGER...");
        await prisma.user.upsert({
            where: { username: 'manager' },
            update: { passwordHash: managerHash, isActive: true },
            create: { username: 'manager', name: 'ผู้จัดการ', passwordHash: managerHash, role: 'MANAGER', isActive: true }
        });

        console.log("✅ อัปเดตรหัสผ่านและผู้ใช้งานบน Railway สำเร็จแล้ว! คุณสามารถเข้าสู่ระบบด้วยรหัสใหม่ได้เลย");
    } catch (err) {
        console.error("Error encountered:", err.message);
    }
}

main().finally(() => prisma.$disconnect());
