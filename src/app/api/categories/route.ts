import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok } from '@/lib/api'

// GET /api/categories
export const GET = withAuth(async () => {
    const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
    })
    return ok(categories)
})
