import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok } from '@/lib/api'

// GET /api/locations
export const GET = withAuth(async () => {
    const locations = await prisma.location.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
            _count: { select: { inventory: true } },
        },
    })
    return ok(locations)
})
