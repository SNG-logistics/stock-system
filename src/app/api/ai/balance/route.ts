import { NextRequest } from 'next/server'
import { withAuth, ok, err } from '@/lib/api'

/**
 * GET /api/ai/balance
 * Check OpenRouter API key balance/credits
 */
export const GET = withAuth(async (_req: NextRequest) => {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return err('ไม่พบ OPENROUTER_API_KEY ใน .env')
        }

        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error('OpenRouter balance check error:', errText)
            return err(`ไม่สามารถตรวจสอบยอดเงินได้ (${response.status})`)
        }

        const data = await response.json()

        // OpenRouter returns: { data: { label, usage, limit, is_free_tier, rate_limit } }
        const info = data.data || data
        const usage = info.usage ?? 0
        const limit = info.limit ?? null
        const remaining = limit !== null ? limit - usage : null
        const isLow = remaining !== null && remaining < 1

        return ok({
            label: info.label || 'OpenRouter API Key',
            usage: typeof usage === 'number' ? Number(usage.toFixed(4)) : usage,
            limit: limit,
            remaining: remaining !== null ? Number(remaining.toFixed(4)) : null,
            isFreeTier: info.is_free_tier ?? false,
            rateLimit: info.rate_limit ?? null,
            warning: isLow ? '⚠️ เครดิตเหลือน้อยกว่า $1 กรุณาเติมเงิน' : null,
        })
    } catch (error) {
        console.error('Balance check error:', error)
        return err('เกิดข้อผิดพลาดในการตรวจสอบยอดเงิน')
    }
})
