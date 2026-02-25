import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { username, password } = loginSchema.parse(body)

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user || !user.isActive) {
            return NextResponse.json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
        }

        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) {
            return NextResponse.json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
        }

        const token = signToken({ userId: user.id, username: user.username, role: user.role, name: user.name })

        const res = NextResponse.json({
            success: true,
            data: { name: user.name, role: user.role, username: user.username }
        })
        res.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30, // 30 days — matches JWT expiresIn
            path: '/',
            sameSite: 'lax',
        })
        return res
    } catch (err) {
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }
}

export async function DELETE() {
    const res = NextResponse.json({ success: true })
    res.cookies.delete('token')
    return res
}
