import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api'

// Category code → SKU prefix mapping
const SKU_PREFIX: Record<string, string> = {
    BEER: 'B', BEER_DRAFT: 'BD', WINE: 'W', COCKTAIL: 'CK',
    DRINK: 'D', WATER: 'WI', FOOD_GRILL: 'FG', FOOD_FRY: 'FF',
    FOOD_RICE: 'FR', FOOD_NOODLE: 'FN', FOOD_SEA: 'FS', FOOD_VEG: 'FV',
    FOOD_LAAB: 'FL', KARAOKE: 'KR', SET: 'ST', ENTERTAIN: 'EN',
    RAW_MEAT: 'RM', RAW_PORK: 'RP', RAW_SEA: 'RS', RAW_VEG: 'RV',
    DRY_GOODS: 'DG', PACKAGING: 'PK', OTHER: 'OT',
}

// GET /api/products/next-sku?categoryId=xxx
export const GET = withAuth(async (req: NextRequest) => {
    const url = new URL(req.url)
    const categoryId = url.searchParams.get('categoryId')
    if (!categoryId) return err('กรุณาระบุ categoryId')

    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) return err('ไม่พบหมวดหมู่')

    const prefix = SKU_PREFIX[category.code] || 'XX'

    const existing = await prisma.product.findMany({
        where: { sku: { startsWith: prefix } },
        select: { sku: true },
    })

    const exactMatches = existing.filter(p => {
        const rest = p.sku.slice(prefix.length)
        return /^\d+$/.test(rest)
    })

    let nextNum = 1
    if (exactMatches.length > 0) {
        const maxNum = Math.max(...exactMatches.map(p => parseInt(p.sku.slice(prefix.length)) || 0))
        nextNum = maxNum + 1
    }

    const nextSku = `${prefix}${String(nextNum).padStart(2, '0')}`

    return ok({ prefix, nextSku, categoryCode: category.code })
})
