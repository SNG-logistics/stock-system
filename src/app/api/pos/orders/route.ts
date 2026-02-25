import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api'
import { z } from 'zod'

// Generate order number: ORD-YYMMDD-XXXX
function generateOrderNumber(): string {
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    return `ORD-${yy}${mm}${dd}-${rand}`
}

const createOrderSchema = z.object({
    tableId: z.string().min(1),
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
        note: z.string().optional(),
    })).optional(),
})

// GET /api/pos/orders — list open orders
export const GET = withAuth(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'OPEN'

    const orders = await prisma.order.findMany({
        where: { status: status as 'OPEN' | 'CLOSED' | 'CANCELLED' | 'VOID' },
        orderBy: { openedAt: 'desc' },
        include: {
            table: true,
            items: {
                include: { product: true },
            },
            payments: true,
            createdBy: { select: { id: true, name: true } },
        },
    })
    return ok(orders)
})

// POST /api/pos/orders — create new order
export const POST = withAuth(async (req: NextRequest, ctx) => {
    try {
        const body = await req.json()
        const data = createOrderSchema.parse(body)

        // Check if table already has an open order
        const existingOrder = await prisma.order.findFirst({
            where: { tableId: data.tableId, status: 'OPEN' },
        })
        if (existingOrder) {
            return err('โต๊ะนี้มีออเดอร์เปิดอยู่แล้ว')
        }

        // Generate unique order number
        let orderNumber = generateOrderNumber()
        let attempts = 0
        while (attempts < 10) {
            const exists = await prisma.order.findUnique({ where: { orderNumber } })
            if (!exists) break
            orderNumber = generateOrderNumber()
            attempts++
        }

        const subtotal = data.items
            ? data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
            : 0

        const order = await prisma.order.create({
            data: {
                orderNumber,
                tableId: data.tableId,
                createdById: ctx.user?.userId,
                subtotal,
                totalAmount: subtotal,
                items: data.items ? {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        note: item.note || null,
                    })),
                } : undefined,
            },
            include: {
                table: true,
                items: { include: { product: true } },
            },
        })

        // Update table status
        await prisma.diningTable.update({
            where: { id: data.tableId },
            data: { status: 'OCCUPIED' },
        })

        return ok(order)
    } catch (error) {
        if (error instanceof z.ZodError) return err(error.errors.map(e => e.message).join(', '))
        console.error('Create order error:', error)
        return err('เกิดข้อผิดพลาด')
    }
}, ['OWNER', 'MANAGER', 'CASHIER'])
