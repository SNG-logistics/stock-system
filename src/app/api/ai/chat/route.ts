import { NextRequest } from 'next/server'
import { withAuth, ok, err } from '@/lib/api'
import { pickTier, getModel, getFallbackModel, checkBudget } from '@/lib/ai-router'

const SYSTEM_PROMPT = `You are an AI assistant for 43 Garden Cafe & Restaurant (ร้าน 43 Garden วังเวียง).
You help with stock management, recipes, menu planning, and general restaurant operations.
Currency: LAK (กีบ). Answer in Thai unless the user writes in English.
Be concise, practical, and helpful. Use bullet points when listing items.`

interface ChatMessage {
    role: string
    content: string
}

interface ChatBody {
    messages: ChatMessage[]
    context?: string
}

/**
 * POST /api/ai/chat
 * Body: { messages: [{role, content}], context?: string }
 * Returns: { reply, model, tier, tokensUsed }
 */
export const POST = withAuth(async (req: NextRequest) => {
    try {
        const body = (await req.json()) as ChatBody
        const { messages, context } = body

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return err('กรุณาส่งข้อความ')
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return err('ไม่พบ OPENROUTER_API_KEY ใน .env')
        }

        // Check budget
        const budget = checkBudget()
        if (!budget.allowed) {
            return err(budget.reason || 'งบ AI หมดแล้ว')
        }

        // Pick tier based on complexity
        const tier = pickTier(messages)
        const model = getModel(tier)

        // Build messages with system prompt
        const systemContent = context
            ? `${SYSTEM_PROMPT}\n\nบริบทเพิ่มเติม:\n${context}`
            : SYSTEM_PROMPT

        const apiMessages = [
            { role: 'system', content: systemContent },
            ...messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
            })),
        ]

        // Call OpenRouter
        let reply: string
        let usedModel = model
        let tokensUsed = 0

        try {
            const result = await callOpenRouter(apiKey, usedModel, apiMessages)
            reply = result.reply
            tokensUsed = result.tokensUsed
        } catch (primaryError) {
            console.error(`Primary model (${usedModel}) failed:`, primaryError)

            // Fallback
            const fallbackModel = getFallbackModel()
            if (fallbackModel === usedModel) {
                return err('AI ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่')
            }

            console.log(`Retrying with fallback model: ${fallbackModel}`)
            usedModel = fallbackModel

            try {
                const result = await callOpenRouter(apiKey, usedModel, apiMessages)
                reply = result.reply
                tokensUsed = result.tokensUsed
            } catch (fallbackError) {
                console.error('Fallback model also failed:', fallbackError)
                return err('AI ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง')
            }
        }

        return ok({
            reply,
            model: usedModel,
            tier,
            tokensUsed,
        })
    } catch (error) {
        console.error('AI chat error:', error)
        return err('เกิดข้อผิดพลาดในการเชื่อมต่อ AI')
    }
})

async function callOpenRouter(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
): Promise<{ reply: string; tokensUsed: number }> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://43garden.stock-system.local',
            'X-Title': '43 Garden Stock System',
        },
        body: JSON.stringify({
            model,
            messages,
            stream: false,
            temperature: 0.7,
            max_tokens: 2048,
        }),
    })

    if (!response.ok) {
        const errText = await response.text()
        console.error(`OpenRouter error (${response.status}):`, errText)
        throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim() || ''
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)

    if (!reply) {
        throw new Error('Empty response from AI')
    }

    return { reply, tokensUsed }
}
