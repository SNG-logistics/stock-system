import { NextRequest } from 'next/server'
import { withAuth, ok, err } from '@/lib/api'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/reports/kitchen-analysis
 * วิเคราะห์ของสดคงเหลือในครัว (KIT_STOCK + WH_FRESH)
 * ส่งข้อมูลให้ AI ประเมิน: %ของเสีย, ของบูด, ความเสี่ยง
 */
export const POST = withAuth(async (req: NextRequest) => {
    try {
        const apiKey = process.env.COMET_API_KEY
        const apiUrl = process.env.COMET_API_URL || 'https://api.cometapi.com/v1'
        const model = process.env.COMET_MODEL || 'gpt-4o-mini'

        if (!apiKey) return err('ไม่พบ COMET_API_KEY')

        const now = new Date()

        // 1) ดึง inventory จาก KIT_STOCK และ WH_FRESH
        const kitLocations = await prisma.location.findMany({
            where: { code: { in: ['KIT_STOCK', 'WH_FRESH', 'FR_FREEZER'] }, isActive: true },
            select: { id: true, code: true, name: true }
        })

        const locationIds = kitLocations.map(l => l.id)
        const locationMap = Object.fromEntries(kitLocations.map(l => [l.id, l]))

        const inventory = await prisma.inventory.findMany({
            where: {
                locationId: { in: locationIds },
                quantity: { gt: 0 }
            },
            include: {
                product: {
                    select: {
                        sku: true, name: true, unit: true,
                        productType: true, costPrice: true,
                        category: { select: { code: true, name: true } }
                    }
                }
            },
            orderBy: { updatedAt: 'asc' } // เก่าสุดก่อน
        })

        // 2) คำนวณ daysStale = วันที่ไม่มีการเคลื่อนไหว
        const items = inventory.map(inv => {
            const daysSinceUpdate = Math.floor((now.getTime() - inv.updatedAt.getTime()) / 86400000)
            const stockValue = inv.quantity * inv.product.costPrice
            return {
                sku: inv.product.sku,
                name: inv.product.name,
                category: inv.product.category.name,
                categoryCode: inv.product.category.code,
                productType: inv.product.productType,
                location: locationMap[inv.locationId]?.code || '?',
                locationName: locationMap[inv.locationId]?.name || '?',
                quantity: inv.quantity,
                unit: inv.product.unit,
                costPrice: inv.product.costPrice,
                stockValue,
                daysSinceUpdate,
                lastUpdated: inv.updatedAt.toISOString().split('T')[0],
            }
        })

        const totalValue = items.reduce((s, i) => s + i.stockValue, 0)
        const totalItems = items.length

        // สรุปสำหรับ prompt
        const itemList = items.map(i =>
            `- [${i.sku}] ${i.name} (${i.category}) | ${i.location} | คงเหลือ: ${i.quantity} ${i.unit} | ต้นทุน: ${i.costPrice.toLocaleString()} KIP | มูลค่า: ${i.stockValue.toLocaleString()} KIP | ไม่เคลื่อนไหว: ${i.daysSinceUpdate} วัน | อัพเดตล่าสุด: ${i.lastUpdated}`
        ).join('\n')

        const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการจัดการวัตถุดิบและอาหารสด สำหรับร้านครัวคุณโอ่ง

ข้อมูลสต็อกครัวและวัตถุดิบสดปัจจุบัน (วันที่: ${now.toLocaleDateString('th-TH')}):

${itemList}

มูลค่าสต็อกรวม: ${totalValue.toLocaleString()} KIP | สินค้า: ${totalItems} รายการ

วิเคราะห์และประเมินสถานการณ์ โดยตอบเป็น JSON รูปแบบนี้:
{
  "summary": "สรุปภาพรวมสถานการณ์ 2-3 ประโยค",
  "overallRisk": "LOW|MEDIUM|HIGH",
  "estimatedSpoilagePercent": ตัวเลข 0-100 (ประมาณ%ของเสีย/สูญเสียจากสต็อกทั้งหมด),
  "estimatedSpoilageValue": ตัวเลข (มูลค่า KIP ที่คาดว่าจะเสีย),
  "alerts": [
    { "level": "HIGH|MEDIUM|LOW", "sku": "...", "name": "...", "reason": "เหตุผลที่ควรระวัง", "action": "สิ่งที่ควรทำ" }
  ],
  "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2", "คำแนะนำ 3"],
  "goodItems": ["SKU ที่สต็อกปกติ ไม่มีความเสี่ยง"]
}

กฎการประเมิน:
- ของสด (เนื้อ, ผัก, อาหารทะเล, นม, ไข่): ไม่เคลื่อนไหว >2 วัน = MEDIUM risk, >3 วัน = HIGH risk (น่าจะบูด/เสีย)
- ของแช่แข็ง (FR_FREEZER): ไม่เคลื่อนไหว >7 วัน = MEDIUM, >14 วัน = HIGH
- ของแห้ง (DRY_GOODS): ไม่เคลื่อนไหว >30 วัน = LOW risk เท่านั้น
- เครื่องดื่ม/เบียร์: ไม่ประเมินเป็นของเสีย
- ให้คำแนะนำแบบปฏิบัติได้จริง เช่น นำไปทำเมนูพิเศษ, แจกพนักงาน, ลดราคาขาย

ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น`

        const aiRes = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                temperature: 0.2,
                max_tokens: 1200,
            })
        })

        if (!aiRes.ok) return err(`AI API error: ${aiRes.status}`)

        const aiData = await aiRes.json()
        const content = (aiData.choices?.[0]?.message?.content || '').trim()

        let analysis: {
            summary: string
            overallRisk: string
            estimatedSpoilagePercent: number
            estimatedSpoilageValue: number
            alerts: { level: string; sku: string; name: string; reason: string; action: string }[]
            recommendations: string[]
            goodItems: string[]
        } | null = null

        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) analysis = JSON.parse(jsonMatch[0])
        } catch {
            return err('AI ตอบผิดรูปแบบ')
        }

        return ok({
            items,
            totalItems,
            totalValue,
            analysis,
            generatedAt: now.toISOString(),
        })

    } catch (error) {
        console.error('kitchen-analysis error:', error)
        return err('เกิดข้อผิดพลาด')
    }
}, ['OWNER', 'MANAGER', 'KITCHEN', 'WAREHOUSE'])
