import { NextRequest } from 'next/server'
import { withAuth, ok, err } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// POST /api/stock-count/scan — อ่านใบนับสต็อคด้วย AI
export const POST = withAuth(async (req: NextRequest) => {
    try {
        const { imageBase64 } = await req.json()
        if (!imageBase64) return err('ไม่พบรูปภาพ')

        const apiKey = process.env.COMET_API_KEY || process.env.OPENROUTER_API_KEY
        const apiUrl = process.env.COMET_API_URL || 'https://openrouter.ai/api/v1'
        const model = process.env.COMET_MODEL || 'openai/gpt-4o'

        if (!apiKey) return err('ไม่ได้ตั้งค่า API key')

        // ── AI call ─────────────────────────────────────────────
        const aiRes = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `You are reading a stock count sheet photo (ใบนับสต็อค). 
Extract every row that has a product name and a counted quantity.
Return ONLY a valid JSON array: [{"name": "product name", "qty": number, "unit": "unit or empty string"}]
- Include every item you can read, even if handwritten or blurry
- qty must be a number (use 0 if illegible)
- name: use the exact text from the sheet
- unit: kg, ขวด, กล่อง, ชิ้น, etc. if visible, otherwise ""
- Do NOT include column headers, totals, or empty rows
- Return only the JSON array, no markdown, no explanation`,
                        },
                        {
                            type: 'image_url',
                            image_url: { url: imageBase64, detail: 'high' },
                        },
                    ],
                }],
                max_tokens: 2000,
                temperature: 0.1,
            }),
        })

        if (!aiRes.ok) {
            const txt = await aiRes.text()
            console.error('AI error:', txt)
            return err('AI ตอบกลับผิดพลาด')
        }

        const aiJson = await aiRes.json()
        const rawText = aiJson.choices?.[0]?.message?.content || ''

        // ── Parse JSON from AI response ─────────────────────────
        let extracted: { name: string; qty: number; unit: string }[] = []
        try {
            const match = rawText.match(/\[[\s\S]*\]/)
            if (match) extracted = JSON.parse(match[0])
        } catch {
            console.error('Parse error:', rawText)
            return err('AI อ่านใบนับสต็อคไม่ได้ กรุณาถ่ายรูปใหม่ให้ชัดขึ้น')
        }

        if (!extracted.length) {
            return err('ไม่พบรายการในใบนับสต็อค กรุณาถ่ายรูปใหม่')
        }

        // ── Fuzzy match to products ─────────────────────────────
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: { category: true },
            orderBy: { name: 'asc' },
        })

        const matched = extracted.map(row => {
            const nameLower = row.name.toLowerCase().replace(/\s+/g, '')
            // Try exact match first, then partial
            let found = products.find(p =>
                p.name.toLowerCase().replace(/\s+/g, '') === nameLower ||
                p.sku.toLowerCase() === nameLower
            )
            if (!found) {
                found = products.find(p =>
                    p.name.toLowerCase().includes(nameLower) ||
                    nameLower.includes(p.name.toLowerCase().replace(/\s+/g, '').substring(0, 4))
                )
            }
            return {
                rawName: row.name,
                qty: typeof row.qty === 'number' ? row.qty : 0,
                unit: row.unit || '',
                productId: found?.id || null,
                productName: found?.name || null,
                productSku: found?.sku || null,
                productUnit: found?.unit || null,
                matched: !!found,
            }
        })

        return ok({ items: matched, total: matched.length, matched: matched.filter(m => m.matched).length })
    } catch (e) {
        console.error('Scan error:', e)
        return err('เกิดข้อผิดพลาด')
    }
}, ['OWNER', 'MANAGER', 'WAREHOUSE'])
