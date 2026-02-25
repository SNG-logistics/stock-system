import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api'
import * as XLSX from 'xlsx'

// GET /api/products/export — Export products to Excel for stock counting
export const GET = withAuth(async (req: NextRequest) => {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'all' // all, sale, raw
    const locationCode = url.searchParams.get('location') || 'WH_MAIN'

    // Build filter
    const where: Record<string, unknown> = { isActive: true }
    if (type === 'sale') where.productType = { in: ['SALE_ITEM', 'ENTERTAIN'] }
    if (type === 'raw') where.productType = { in: ['RAW_MATERIAL', 'PACKAGING'] }

    const products = await prisma.product.findMany({
        where,
        include: {
            category: true,
            inventory: {
                include: { location: true },
            },
        },
        orderBy: [{ category: { name: 'asc' } }, { sku: 'asc' }],
    })

    // Build rows for Excel
    const rows = products.map((p, i) => {
        // Find stock for specified location
        const inv = p.inventory.find(iv => iv.location.code === locationCode)
        const totalStock = p.inventory.reduce((sum, iv) => sum + iv.quantity, 0)
        const cf = p.convFactor ?? 0
        const kgEstimate = cf > 0 && inv ? (inv.quantity * cf) : null

        return {
            'ลำดับ': i + 1,
            'SKU': p.sku,
            'ชื่อสินค้า': p.name,
            'หมวดหมู่': p.category?.name || '-',
            'ประเภท': p.productType === 'SALE_ITEM' ? 'สินค้าขาย'
                : p.productType === 'RAW_MATERIAL' ? 'วัตถุดิบ'
                : p.productType === 'PACKAGING' ? 'บรรจุภัณฑ์'
                : p.productType === 'ENTERTAIN' ? 'Entertain' : p.productType,
            'หน่วยหลัก': p.unit,
            'หน่วยรอง': p.unitAlt || '-',
            'อัตราแปลง': cf > 0 ? cf : '-',
            'ต้นทุน (₭)': p.costPrice,
            'ราคาขาย (₭)': p.salePrice,
            'สต็อคในระบบ': inv ? inv.quantity : 0,
            'สต็อค (kg)': kgEstimate !== null ? Math.round(kgEstimate * 100) / 100 : '-',
            'นับจริง': '', // Empty column for manual counting
            'ผลต่าง': '', // Empty column for difference
            'หมายเหตุ': p.note || '',
        }
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    ws['!cols'] = [
        { wch: 6 },   // ลำดับ
        { wch: 8 },   // SKU
        { wch: 28 },  // ชื่อสินค้า
        { wch: 18 },  // หมวดหมู่
        { wch: 12 },  // ประเภท
        { wch: 10 },  // หน่วยหลัก
        { wch: 10 },  // หน่วยรอง
        { wch: 10 },  // อัตราแปลง
        { wch: 14 },  // ต้นทุน
        { wch: 14 },  // ราคาขาย
        { wch: 12 },  // สต็อคในระบบ
        { wch: 12 },  // สต็อค kg
        { wch: 12 },  // นับจริง
        { wch: 10 },  // ผลต่าง
        { wch: 20 },  // หมายเหตุ
    ]

    const today = new Date().toISOString().split('T')[0]
    const sheetName = type === 'raw' ? 'วัตถุดิบ' : type === 'sale' ? 'สินค้าขาย' : 'ทั้งหมด'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const filename = `stock-count-${type}-${today}.xlsx`

    return new NextResponse(buf, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
})
