'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface StockItem {
    sku: string; name: string; category: string; location: string; locationName: string
    quantity: number; unit: string; costPrice: number; stockValue: number
    daysSinceUpdate: number; lastUpdated: string; productType: string
}
interface Alert { level: string; sku: string; name: string; reason: string; action: string }
interface Analysis {
    summary: string; overallRisk: string
    estimatedSpoilagePercent: number; estimatedSpoilageValue: number
    alerts: Alert[]; recommendations: string[]; goodItems: string[]
}
interface Result { items: StockItem[]; totalItems: number; totalValue: number; analysis: Analysis; generatedAt: string }

function fmtLAK(n: number) { return n.toLocaleString() + ' ₭' }
function riskColor(r: string) { return r === 'HIGH' ? '#dc2626' : r === 'MEDIUM' ? '#d97706' : '#16a34a' }
function riskBg(r: string) { return r === 'HIGH' ? 'rgba(220,38,38,0.07)' : r === 'MEDIUM' ? 'rgba(217,119,6,0.07)' : 'rgba(22,163,74,0.07)' }
function levelIcon(l: string) { return l === 'HIGH' ? '🔴' : l === 'MEDIUM' ? '🟡' : '🟢' }
function daysBadge(d: number, type: string) {
    const isFresh = type === 'RAW_MATERIAL'
    if (!isFresh) return null
    if (d >= 3) return { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', label: `${d} วัน ⚠️` }
    if (d >= 2) return { color: '#d97706', bg: 'rgba(217,119,6,0.1)', label: `${d} วัน` }
    return { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', label: `${d} วัน` }
}

export default function KitchenAnalysisPage() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<Result | null>(null)
    const [tab, setTab] = useState<'overview' | 'items' | 'alerts'>('overview')

    async function runAnalysis() {
        setLoading(true)
        try {
            const res = await fetch('/api/reports/kitchen-analysis', { method: 'POST' })
            const json = await res.json()
            if (!json.success) return toast.error(json.error || 'วิเคราะห์ไม่ได้')
            setResult(json.data)
            toast.success('✅ วิเคราะห์เสร็จแล้ว')
        } catch {
            toast.error('เชื่อมต่อ AI ไม่ได้')
        } finally {
            setLoading(false)
        }
    }

    const an = result?.analysis

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🧑‍🍳 วิเคราะห์ครัว — ของสดคงเหลือ</h1>
                    <p className="page-subtitle">ประเมิน%ของเสีย, ของบูด, ความเสี่ยง จาก AI — KIT_STOCK / WH_FRESH / FR_FREEZER</p>
                </div>
                <button onClick={runAnalysis} disabled={loading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1.4rem' }}>
                    {loading ? '⏳ AI กำลังวิเคราะห์...' : '🔍 วิเคราะห์ด้วย AI'}
                </button>
            </div>

            {/* Empty state */}
            {!result && !loading && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🧑‍🍳</div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', marginBottom: 8 }}>วิเคราะห์สต็อกครัว</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 420, margin: '0 auto 20px' }}>
                        AI จะตรวจสอบ inventory ใน KIT_STOCK, WH_FRESH, FR_FREEZER และประเมินว่ารายการใดเสี่ยงเสีย/บูด พร้อมแนะนำวิธีจัดการ
                    </p>
                    <button onClick={runAnalysis} className="btn-primary">🔍 เริ่มวิเคราะห์</button>
                </div>
            )}

            {loading && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>🤖</div>
                    <p style={{ color: 'var(--accent)', fontWeight: 600 }}>AI กำลังวิเคราะห์สต็อกครัว...</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6 }}>ประเมิน%ของเสีย, ของบูด และความเสี่ยงสต็อก</p>
                </div>
            )}

            {result && an && (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                        <div className="stat-card">
                            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>ภาพรวมความเสี่ยง</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: riskColor(an.overallRisk), marginTop: 4 }}>{an.overallRisk}</p>
                        </div>
                        <div className="stat-card">
                            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>%คาดว่าจะเสีย</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: an.estimatedSpoilagePercent > 20 ? '#dc2626' : '#d97706', marginTop: 4 }}>{an.estimatedSpoilagePercent}%</p>
                        </div>
                        <div className="stat-card">
                            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>มูลค่าเสี่ยงสูญ</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{fmtLAK(an.estimatedSpoilageValue)}</p>
                        </div>
                        <div className="stat-card">
                            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>มูลค่าสต็อกรวม</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{fmtLAK(result.totalValue)}</p>
                        </div>
                    </div>

                    {/* AI Summary */}
                    <div style={{
                        background: riskBg(an.overallRisk), border: `1.5px solid ${riskColor(an.overallRisk)}40`,
                        borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 20,
                        borderLeft: `4px solid ${riskColor(an.overallRisk)}`
                    }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: riskColor(an.overallRisk), marginBottom: 4 }}>🤖 AI สรุปสถานการณ์</p>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>{an.summary}</p>
                        {result.generatedAt && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                วิเคราะห์เมื่อ: {new Date(result.generatedAt).toLocaleString('th-TH')}
                            </p>
                        )}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        {([['overview', '📊 ภาพรวม'], ['alerts', `⚠️ แจ้งเตือน (${an.alerts.length})`], ['items', `📦 รายการสต็อก (${result.totalItems})`]] as [string, string][]).map(([key, label]) => (
                            <button key={key} onClick={() => setTab(key as 'overview' | 'items' | 'alerts')}
                                style={{
                                    padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)',
                                    background: tab === key ? 'var(--accent)' : 'var(--white)',
                                    color: tab === key ? 'white' : 'var(--text)',
                                    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                                }}>{label}</button>
                        ))}
                    </div>

                    {/* Tab: Overview */}
                    {tab === 'overview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {/* Recommendations */}
                            <div className="card">
                                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: 'var(--text)' }}>💡 คำแนะนำจาก AI</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {an.recommendations.map((r, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                            <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                                            <p style={{ fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.5 }}>{r}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Top Alerts */}
                            <div className="card">
                                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: 'var(--text)' }}>🚨 รายการเร่งด่วน (HIGH)</h4>
                                {an.alerts.filter(a => a.level === 'HIGH').length === 0 ? (
                                    <p style={{ color: '#16a34a', fontSize: '0.85rem' }}>✅ ไม่มีรายการฉุกเฉิน</p>
                                ) : an.alerts.filter(a => a.level === 'HIGH').map((a, i) => (
                                    <div key={i} style={{ background: 'rgba(220,38,38,0.06)', borderRadius: 8, padding: '0.6rem 0.875rem', marginBottom: 6, border: '1px solid rgba(220,38,38,0.2)' }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.82rem', color: '#dc2626' }}>🔴 {a.name}</p>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.reason}</p>
                                        <p style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: 2, fontWeight: 600 }}>→ {a.action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab: Alerts */}
                    {tab === 'alerts' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {an.alerts.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p style={{ color: '#16a34a', fontWeight: 600 }}>✅ ไม่มีรายการเสี่ยง</p>
                                </div>
                            ) : an.alerts.map((a, i) => (
                                <div key={i} style={{
                                    background: riskBg(a.level), border: `1px solid ${riskColor(a.level)}35`,
                                    borderRadius: 12, padding: '0.875rem 1rem',
                                    borderLeft: `4px solid ${riskColor(a.level)}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span>{levelIcon(a.level)}</span>
                                        <span style={{ fontWeight: 700, color: riskColor(a.level), fontSize: '0.88rem' }}>{a.name}</span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{a.sku}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: 4 }}>📌 {a.reason}</p>
                                    <p style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>✅ แนะนำ: {a.action}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab: Items */}
                    {tab === 'items' && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>สินค้า</th><th>คลัง</th><th style={{ textAlign: 'right' }}>คงเหลือ</th>
                                        <th style={{ textAlign: 'right' }}>ต้นทุน/หน่วย</th><th style={{ textAlign: 'right' }}>มูลค่า</th>
                                        <th style={{ textAlign: 'center' }}>ไม่เคลื่อนไหว</th><th>อัพเดตล่าสุด</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.items.map((item, i) => {
                                        const badge = daysBadge(item.daysSinceUpdate, item.productType)
                                        const isAlert = an.alerts.some(a => a.sku === item.sku && (a.level === 'HIGH' || a.level === 'MEDIUM'))
                                        return (
                                            <tr key={i} style={{ background: isAlert ? 'rgba(220,38,38,0.025)' : undefined }}>
                                                <td>
                                                    <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</p>
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.sku} · {item.category}</p>
                                                </td>
                                                <td><span style={{ fontSize: '0.72rem', fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{item.location}</span></td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.quantity} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.unit}</span></td>
                                                <td style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.costPrice.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>{item.stockValue.toLocaleString()} ₭</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {badge ? (
                                                        <span style={{ background: badge.bg, color: badge.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{badge.label}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.daysSinceUpdate}d</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.lastUpdated}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
