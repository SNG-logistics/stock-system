import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api'
import * as XLSX from 'xlsx'

/**
 * GET /api/sales/sample-template
 * Downloads a sample .xlsx file for manual sales entry (for shops without POS)
 */
export const GET = withAuth(async (_req: NextRequest) => {
    const rows = [
        ['ลำดับ', 'ชื่อสินค้า', 'ราคา/หน่วย', 'จำนวน', 'หมวด'],
        [1, 'ข้าวผัดหมู', 35000, 5, 'อาหาร'],
        [2, 'ต้มยำกุ้ง', 55000, 3, 'อาหาร'],
        [3, 'น้ำเปล่า', 10000, 10, 'เครื่องดื่ม'],
        [4, 'โค้ก', 15000, 8, 'เครื่องดื่ม'],
        [5, 'คอหมูย่าง', 65000, 4, 'อาหาร'],
        [6, 'ยำวุ้นเส้น', 45000, 2, 'อาหาร'],
        [7, 'ชาเย็น', 20000, 6, 'เครื่องดื่ม'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Style header row width
    ws['!cols'] = [
        { wch: 8 },   // ลำดับ
        { wch: 24 },  // ชื่อสินค้า
        { wch: 14 },  // ราคา/หน่วย
        { wch: 10 },  // จำนวน
        { wch: 14 },  // หมวด
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ยอดขาย')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="sales-template.xlsx"',
        },
    })
}, ['OWNER', 'MANAGER', 'WAREHOUSE'])
