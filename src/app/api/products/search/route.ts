import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const limit = parseInt(searchParams.get('limit') || '8')

    if (!q || q.length < 1) {
        return NextResponse.json({ products: [] })
    }

    const products = await prisma.product.findMany({
        where: {
            isActive: true,
            OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
                { nameTh: { contains: q } },
            ]
        },
        select: { sku: true, name: true, unit: true },
        take: limit,
        orderBy: { name: 'asc' },
    })

    return NextResponse.json({ products })
}
