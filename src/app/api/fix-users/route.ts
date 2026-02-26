import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
    try {
        const ownerHash = bcrypt.hashSync('owner1234', 12)
        const staffHash = bcrypt.hashSync('staff1234', 12)
        const managerHash = bcrypt.hashSync('manager1234', 12)

        const tasks = [
            prisma.user.upsert({
                where: { username: 'owner' },
                update: { passwordHash: ownerHash, isActive: true },
                create: { username: 'owner', name: 'เจ้าของร้าน', passwordHash: ownerHash, role: 'OWNER', isActive: true }
            }),
            prisma.user.upsert({
                where: { username: 'kitchen' },
                update: { passwordHash: staffHash, isActive: true },
                create: { username: 'kitchen', name: 'ครัว', passwordHash: staffHash, role: 'KITCHEN', isActive: true }
            }),
            prisma.user.upsert({
                where: { username: 'manager' },
                update: { passwordHash: managerHash, isActive: true },
                create: { username: 'manager', name: 'ผู้จัดการ', passwordHash: managerHash, role: 'MANAGER', isActive: true }
            })
        ]

        await Promise.all(tasks)

        return NextResponse.json({ success: true, message: '🎉 รีเซ็ตรหัสผ่านผู้ใช้งานเจ้าของร้านและครัว สำเร็จแล้ว! คุณสามารถปิดหน้านี้และล็อกอินได้เลย' })
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
