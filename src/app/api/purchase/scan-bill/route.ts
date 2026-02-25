import { NextRequest } from 'next/server'
import { withAuth, ok, err } from '@/lib/api'

// POST /api/purchase/scan-bill
// Body: { image: string (base64 data URL), mimeType?: string }
export const POST = withAuth(async (req: NextRequest) => {
    const body = await req.json()
    const { image } = body as { image: string }

    if (!image) return err('กรุณาส่งรูปมาด้วย')

    // Strip data URL prefix if present  → get pure base64
    const base64 = image.includes(',') ? image.split(',')[1] : image
    const mimeType = image.startsWith('data:') ? image.split(';')[0].replace('data:', '') : 'image/jpeg'

    const apiKey = process.env.COMET_API_KEY
    const apiUrl = process.env.COMET_API_URL || 'https://api.cometapi.com/v1'
    const model = process.env.COMET_MODEL || 'gpt-4o'

    if (!apiKey) return err('ไม่พบ COMET_API_KEY')

    const prompt = `You are an expert at reading purchase/invoice bills for a restaurant/food business.

Analyze this bill image and extract ALL line items.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "supplier": "ชื่อร้านหรือซัพพลายเออร์ (string หรือ null)",
  "billDate": "YYYY-MM-DD (string หรือ null)",
  "items": [
    {
      "name": "ชื่อสินค้า (ภาษาไทยหรืออังกฤษตามบิล)",
      "quantity": 1.0,
      "unit": "หน่วย เช่น kg, กก, ลัง, ขวด, ชิ้น",
      "unitPrice": 0.0,
      "totalPrice": 0.0
    }
  ],
  "totalAmount": 0.0,
  "notes": "ข้อมูลอื่นๆ ที่น่าสนใจ (string หรือ null)"
}

Rules:
- Extract every line item visible
- If unit is missing, guess from context (kg for meat/produce, bottle for drinks, etc.)
- Convert Thai numbers to Arabic numerals
- All prices as numbers (no currency symbols)
- If a field is unclear, use null`

    try {
        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64}`,
                                    detail: 'high',
                                }
                            },
                            {
                                type: 'text',
                                text: prompt,
                            }
                        ]
                    }
                ]
            })
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error('CometAPI error:', errText)
            return err(`AI error: ${response.status}`)
        }

        const aiRes = await response.json()
        const content = aiRes.choices?.[0]?.message?.content || ''

        // Parse JSON from response (clean up any markdown fences)
        const jsonStr = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim()

        const parsed = JSON.parse(jsonStr)
        return ok(parsed)

    } catch (e: unknown) {
        console.error('scan-bill error:', e)
        if (e instanceof SyntaxError) return err('AI ไม่สามารถอ่านบิลได้ กรุณาลองใหม่')
        return err('เกิดข้อผิดพลาดในการเชื่อมต่อ AI')
    }
}, ['OWNER', 'MANAGER', 'WAREHOUSE'])
