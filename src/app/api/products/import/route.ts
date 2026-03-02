import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api'
import * as XLSX from 'xlsx'

// ────────────────────────────────────────────────────────────
// POST /api/products/import
// ────────────────────────────────────────────────────────────
// รับไฟล์ Excel (multipart/form-data, field: "file")
// คอลัมน์ที่รองรับ (ตามที่ export ออก หรือจาก template):
//   ชื่อเมนู   (required)
//   หมวดหมู่   (required — ตรง code หรือ name ของ category)
//   ราคาขาย    (required, LAK)
//   ต้นทุน     (optional)
//   หน่วย      (optional, default: จาน)
//   ประเภท     (optional: SALE_ITEM หรือ ENTERTAIN, default: SALE_ITEM)
//   หมายเหตุ   (optional)
// ────────────────────────────────────────────────────────────

export const POST = withAuth<any>(async (req: NextRequest) => {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        if (!file) {
            return NextResponse.json({ success: false, error: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 })
        }

        // Parse Excel
        const buf = Buffer.from(await file.arrayBuffer())
        const wb = XLSX.read(buf, { type: 'buffer' })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: 'ไฟล์ไม่มีข้อมูล' }, { status: 400 })
        }

        // Load all categories for matching
        const categories = await prisma.category.findMany()
        const catByCode = new Map(categories.map(c => [c.code.toLowerCase(), c]))
        const catByName = new Map(categories.map(c => [c.name.toLowerCase(), c]))

        // Helper: find category by code or name
        function findCategory(val: string) {
            if (!val) return null
            const v = val.trim().toLowerCase()
            return catByCode.get(v) || catByName.get(v) || null
        }

        // Helper: normalize column name (strip spaces, lowercase)
        function col(row: Record<string, unknown>, ...keys: string[]): string {
            for (const k of keys) {
                const found = Object.keys(row).find(r => r.trim().toLowerCase() === k.toLowerCase())
                if (found !== undefined && row[found] !== '') return String(row[found]).trim()
            }
            return ''
        }

        // SKU prefix map (same as products/route.ts)
        const SKU_PREFIX: Record<string, string> = {
            BEER: 'B', BEER_DRAFT: 'BD', WINE: 'W', COCKTAIL: 'CK',
            DRINK: 'D', WATER: 'WI', FOOD_GRILL: 'FG', FOOD_FRY: 'FF',
            FOOD_RICE: 'FR', FOOD_NOODLE: 'FN', FOOD_SEA: 'FS', FOOD_VEG: 'FV',
            FOOD_LAAB: 'FL', KARAOKE: 'KR', SET: 'ST', ENTERTAIN: 'EN',
            RAW_MEAT: 'RM', RAW_PORK: 'RP', RAW_SEA: 'RS', RAW_VEG: 'RV',
            DRY_GOODS: 'DG', PACKAGING: 'PK', OTHER: 'OT',
        }

        // Pre-load existing SKUs so we can generate unique ones quickly
        const existingProducts = await prisma.product.findMany({ select: { sku: true, name: true } })
        const existingSkus = new Set(existingProducts.map(p => p.sku))
        const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase()))

        const results: { row: number; status: 'created' | 'skipped' | 'error'; name: string; reason?: string }[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowNum = i + 2 // Excel row (header = 1)

            // Read required fields — support both TH and EN column names
            const name = col(row, 'ชื่อเมนู', 'ชื่อสินค้า', 'name', 'menu_name', 'menuname')
            const catRaw = col(row, 'หมวดหมู่', 'หมวด', 'category', 'cat')
            const salePriceRaw = col(row, 'ราคาขาย', 'ราคา', 'sale_price', 'saleprice', 'ราคาขาย (₭)')
            const costPriceRaw = col(row, 'ต้นทุน', 'cost', 'cost_price', 'costprice', 'ต้นทุน (₭)')
            const unit = col(row, 'หน่วย', 'unit') || 'จาน'
            const typeRaw = col(row, 'ประเภท', 'type', 'producttype', 'product_type')
            const note = col(row, 'หมายเหตุ', 'note')

            // Validate required
            if (!name) {
                results.push({ row: rowNum, status: 'skipped', name: '-', reason: 'ไม่มีชื่อเมนู' })
                continue
            }

            // Skip duplicates (by name)
            if (existingNames.has(name.toLowerCase())) {
                results.push({ row: rowNum, status: 'skipped', name, reason: 'ชื่อซ้ำในระบบ' })
                continue
            }

            // Find category
            const category = findCategory(catRaw)
            if (!category) {
                results.push({ row: rowNum, status: 'error', name, reason: `ไม่พบหมวดหมู่ "${catRaw}"` })
                continue
            }

            // Parse numbers
            const salePrice = parseFloat(salePriceRaw.replace(/,/g, '')) || 0
            const costPrice = parseFloat(costPriceRaw.replace(/,/g, '')) || 0

            // Determine product type
            let productType: 'SALE_ITEM' | 'ENTERTAIN' = 'SALE_ITEM'
            if (typeRaw.toLowerCase().includes('entertain') || typeRaw === 'ENTERTAIN') {
                productType = 'ENTERTAIN'
            }

            // Generate unique SKU
            const prefix = SKU_PREFIX[category.code] || 'XX'
            let nextNum = 1
            // Find existing SKUs with this prefix
            const prefixSkus = [...existingSkus].filter(s => {
                const rest = s.slice(prefix.length)
                return s.startsWith(prefix) && /^\d+$/.test(rest)
            })
            if (prefixSkus.length > 0) {
                const maxNum = Math.max(...prefixSkus.map(s => parseInt(s.slice(prefix.length)) || 0))
                nextNum = maxNum + 1
            }
            let sku = `${prefix}${String(nextNum).padStart(2, '0')}`
            // Ensure uniqueness
            while (existingSkus.has(sku)) {
                nextNum++
                sku = `${prefix}${String(nextNum).padStart(2, '0')}`
            }

            try {
                await prisma.product.create({
                    data: {
                        sku,
                        name,
                        categoryId: category.id,
                        productType,
                        unit,
                        costPrice,
                        salePrice,
                        note: note || undefined,
                    },
                })
                existingSkus.add(sku)
                existingNames.add(name.toLowerCase())
                results.push({ row: rowNum, status: 'created', name })
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Unknown error'
                results.push({ row: rowNum, status: 'error', name, reason: msg })
            }
        }

        const created = results.filter(r => r.status === 'created').length
        const skipped = results.filter(r => r.status === 'skipped').length
        const errors = results.filter(r => r.status === 'error').length

        return NextResponse.json({
            success: true,
            data: { created, skipped, errors, total: rows.length, results },
        })
    } catch (e: unknown) {
        console.error('Import error:', e)
        const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
    }
}, ['OWNER', 'MANAGER'])
