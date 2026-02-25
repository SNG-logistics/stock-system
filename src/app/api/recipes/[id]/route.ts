import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api'
import { z } from 'zod'

const recipeSchema = z.object({
    menuName: z.string().min(1),
    posMenuCode: z.string().optional(),
    note: z.string().optional(),
    bom: z.array(z.object({
        productId: z.string().min(1),
        locationId: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1),
    })).min(1),
})

// PUT /api/recipes/[id] — แก้ไขสูตร (ลบ BOM เก่าทั้งหมดแล้วสร้างใหม่)
export const PUT = withAuth(async (req: NextRequest, { params }) => {
    try {
        const id = params?.id
        if (!id) return err('ไม่พบ ID')
        const body = await req.json()
        const data = recipeSchema.parse(body)

        const recipe = await prisma.$transaction(async (tx) => {
            // ลบ BOM เก่าทั้งหมด
            await tx.recipeBOM.deleteMany({ where: { recipeId: id } })

            // อัปเดต recipe + สร้าง BOM ใหม่
            return tx.recipe.update({
                where: { id },
                data: {
                    menuName: data.menuName,
                    posMenuCode: data.posMenuCode,
                    note: data.note,
                    bom: {
                        create: data.bom.map(item => ({
                            productId: item.productId,
                            locationId: item.locationId,
                            quantity: item.quantity,
                            unit: item.unit,
                        })),
                    },
                },
                include: { bom: { include: { product: true } } },
            })
        })

        return ok(recipe)
    } catch (error) {
        if (error instanceof z.ZodError) return err(error.errors.map(e => e.message).join(', '))
        console.error('Recipe update error:', error)
        return err('เกิดข้อผิดพลาด')
    }
}, ['OWNER', 'MANAGER'])

// DELETE /api/recipes/[id] — ลบสูตร (soft delete)
export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
    try {
        const id = params?.id
        if (!id) return err('ไม่พบ ID')

        await prisma.recipe.update({
            where: { id },
            data: { isActive: false },
        })

        return ok({ id })
    } catch (error) {
        console.error('Recipe delete error:', error)
        return err('เกิดข้อผิดพลาด')
    }
}, ['OWNER', 'MANAGER'])
