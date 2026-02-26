import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { MovementType } from '@prisma/client'

// PATCH /api/inventory/[id]  — แก้ไข quantity และ/หรือ avgCost
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { quantity, avgCost, note } = body

        if (quantity === undefined && avgCost === undefined) {
            return NextResponse.json({ error: 'ต้องระบุจำนวนหรือต้นทุนอย่างน้อยหนึ่งค่า' }, { status: 400 })
        }

        // Fetch current record for movement log
        const current = await prisma.inventory.findUnique({
            where: { id: id },
            include: { product: true, location: true },
        })
        if (!current) return NextResponse.json({ error: 'ไม่พบ inventory record' }, { status: 404 })

        const newQty = quantity !== undefined ? parseFloat(quantity) : current.quantity
        const newCost = avgCost !== undefined ? parseFloat(avgCost) : current.avgCost

        // Update inventory
        const updated = await prisma.inventory.update({
            where: { id: id },
            data: {
                quantity: newQty,
                avgCost: newCost,
            },
            include: {
                product: { include: { category: true } },
                location: true,
            }
        })

        // Log adjustment movement
        const diff = newQty - current.quantity
        if (diff !== 0) {
            await prisma.stockMovement.create({
                data: {
                    productId: current.productId,
                    fromLocationId: diff < 0 ? current.locationId : undefined,
                    toLocationId: diff > 0 ? current.locationId : undefined,
                    quantity: Math.abs(diff),
                    unitCost: newCost,
                    totalCost: Math.abs(diff) * newCost,
                    type: MovementType.ADJUSTMENT,
                    referenceType: 'MANUAL_EDIT',
                    note: note || `แก้ไขสต็อค: ${current.quantity} → ${newQty} ${current.product.unit}`,
                    createdById: user.userId,
                }
            })
        }

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Inventory patch error:', error)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}
