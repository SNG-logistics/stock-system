/**
 * AI Model Router — 3-Tier Complexity-Based Routing
 * Selects cheap/mid/pro model based on conversation complexity
 */

export const MODELS = {
    cheap: "google/gemini-2.0-flash-001",
    mid: "anthropic/claude-sonnet-4.6",
    pro: "google/gemini-3.1-pro-preview",
    fallback: "google/gemini-2.0-flash-001",
} as const

export type Tier = "cheap" | "mid" | "pro"

const FINANCIAL_KEYWORDS = /\b(ต้นทุน|กำไร|ขาดทุน|งบ|budget|profit|loss|margin|revenue|รายได้|รายจ่าย|ค่าใช้จ่าย|ราคาต้นทุน|food.?cost|break.?even|ROI|cash.?flow|บัญชี|ภาษี|VAT|กระแสเงิน|ยอดขาย|ยอดซื้อ|สรุปรายงาน|financial|forecast|สต็อก.*มูลค่า|inventory.*valu)/i

const COMPLEX_KEYWORDS = /\b(วิเคราะห์|analyze|analysis|เปรียบเทียบ|compare|optimize|ปรับปรุง|strategy|กลยุทธ์|แผน|plan|planning|predict|พยากรณ์|trend|แนวโน้ม|สรุป.*ทั้งหมด|recommend|แนะนำ.*กลยุทธ์|audit|ตรวจสอบ|ประเมิน|evaluate|report.*detail|รายงาน.*ละเอียด)/i

const SIMPLE_KEYWORDS = /\b(สวัสดี|hello|hi|ขอบคุณ|thank|ok|ได้เลย|ดี|ครับ|ค่ะ|yes|no|ใช่|ไม่|เปิดกี่โมง|ที่อยู่|เบอร์โทร|wifi|password|รหัส)/i

/**
 * Score conversation complexity and pick model tier
 */
export function pickTier(messages: { role: string; content: string }[]): Tier {
    let score = 0

    const lastUserMessages = messages.filter(m => m.role === "user")
    const fullText = lastUserMessages.map(m => m.content).join(" ")

    // Length scoring
    if (fullText.length > 1200) score += 2

    // Conversation depth
    if (messages.length > 8) score += 1

    // Financial/stock keywords
    if (FINANCIAL_KEYWORDS.test(fullText)) score += 2

    // Complex task keywords
    if (COMPLEX_KEYWORDS.test(fullText)) score += 3

    // Simple greetings/questions → reduce
    if (SIMPLE_KEYWORDS.test(fullText) && fullText.length < 100) score -= 1

    if (score >= 5) return "pro"
    if (score >= 3) return "mid"
    return "cheap"
}

/**
 * Get model name for a tier
 */
export function getModel(tier: Tier): string {
    return MODELS[tier]
}

/**
 * Get the fallback model
 */
export function getFallbackModel(): string {
    return MODELS.fallback
}

/**
 * Check if budget allows AI calls (placeholder for future usage tracking)
 */
export function checkBudget(): { allowed: boolean; reason?: string } {
    // For now, always allow. Can be extended with DB-based tracking.
    return { allowed: true }
}
