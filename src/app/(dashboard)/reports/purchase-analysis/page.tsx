'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

type Period = 'day' | 'week' | 'month'

interface StatItem {
    sku: string; name: string; category: string; unit: string; productType: string
    totalPurchased: number; totalPurchasedCost: number; totalUsed: number
    surplus: number; surplusPercent: number; currentStock: number
    purchaseCount: number; isOverBought: boolean; isNeverUsed: boolean
}
interface Analysis {
    summary: string; totalWasteRisk: number
    topProblems: { sku: string; name: string; issue: string; suggestion: string }[]
    buyingPattern: string; recommendations: string[]; okItems: string[]
}
interface Result {
    period: Period; periodDays: number; stats: StatItem[]; overBought: StatItem[]
    totalPurchaseCost: number; overBoughtCost: number
    analysis: Analysis | null; generatedAt: string
}

function fmtLAK(n: number) { return n.toLocaleString() + ' ₭' }
function surplusColor(p: number) {
    if (p >= 60) return '#dc2626'
    if (p >= 30) return '#d97706'
    return '#16a34a'
}

const PERIODS: { key: Period; label: string }[] = [
    { key: 'day', label: 'รายวัน (1 วัน)' },
    { key: 'week', label: 'รายสัปดาห์ (7 วัน)' },
    { key: 'month', label: 'รายเดือน (30 วัน)' },
]

export default function PurchaseAnalysisPage() {
    const [loading, setLoading] = useState(false)
    const [period, setPeriod] = useState<Period>('week')
    const [result, setResult] = useState<Result | null>(null)
    const [tab, setTab] = useState<'overview' | 'all' | 'overbought'>('overview')

    async function runAnalysis() {
        setLoading(true)
        try {
            const res = await fetch('/api/reports/purchase-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ period })
            })
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
                    <h1 className="page-title">📦 วิเคราะห์ซื้อซ้ำเกินจำนวน</h1>
                    <p className="page-subtitle">เปรียบเทียบยอดซื้อเข้า vs ยอดใช้จริง — หาของที่สั่งซื้อเกินความต้องการ</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={period} onChange={e => setPeriod(e.target.value as Period)}
                        className="input" style={{ fontSize: '0.82rem', width: 180 }}>
                        {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <button onClick={runAnalysis} disabled={loading} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                        {loading ? '⏳ AI กำลังวิเคราะห์...' : '🔍 วิเคราะห์'}
                    </button>
                </div>
            </div>

            {/* Empty */}
            {!result && !loading && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📊</div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', marginBottom: 8 }}>วิเคราะห์รูปแบบการซื้อ</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 440, margin: '0 auto 20px' }}>
                        AI จะเปรียบเทียบยอดซื้อเข้ากับยอดใช้จริง และบอกว่าสินค้าไหนสั่งซื้อเกินความต้องการ พร้อมแนะนำปริมาณที่เหมาะสม
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                        {PERIODS.map(p => (
                            <button key={p.key} onClick={() => setPeriod(p.key)}
                                style={{
                                    padding: '0.4rem 0.875rem', borderRadius: 8,
                                    border: `1px solid ${period === p.key ? 'var(--accent)' : 'var(--border)'}`,
                                    background: period === p.key ? 'var(--accent)' : 'var(--white)',
                                    color: period === p.key ? 'white' : 'var(--text)',
                                    fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                                }}>{p.label}</button>
                        ))}
                    </div>
                    <button onClick={runAnalysis} className="btn-primary">🔍 เริ่มวิเคราะห์</button>
                </div>
            )}

            {loading && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>🤖</div>
                    <p style={{ color: 'var(--accent)', fontWeight: 600 }}>AI กำลังวิเคราะห์รูปแบบการซื้อ...</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6 }}>เปรียบเทียบยอดซื้อ vs ยอดใช้{period === 'day' ? ' 1 วัน' : period === 'week' ? ' 7 วัน' : ' 30 วัน'}ที่ผ่านมา</p>
                </div>
            )}

            {result && (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                        <div className="stat-card">
                            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>มูลค่าซื้อรวม</p>
                            <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{fmtLAK(result.totalPurchaseCost)}</p>
                        </div>
                        <div className="stat-card">
                            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>รายการซื้อเกิน</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{result.overBought.length}</p>
                        </div>
                        <div className="stat-card">
                            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>มูลค่าซื้อเกิน</p>
                            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>{fmtLAK(result.overBoughtCost)}</p>
                        </div>
                        <div className="stat-card">
                            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>เสี่ยงสูญ (AI ประเมิน)</p>
                            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{fmtLAK(an?.totalWasteRisk || 0)}</p>
                        </div>
                    </div>

                    {/* AI Summary */}
                    {an && (
                        <div style={{
                            background: 'rgba(220,38,38,0.04)', border: '1.5px solid rgba(220,38,38,0.2)',
                            borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 20,
                            borderLeft: '4px solid var(--accent)'
                        }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>🤖 AI สรุปรูปแบบการซื้อ</p>
                            <p style={{ fontSize: '0.87rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{an.summary}</p>
                            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>📌 {an.buyingPattern}</p>
                        </div>
                    )}

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        {([
                            ['overview', '📊 ภาพรวม'],
                            ['overbought', `🔴 ซื้อเกิน (${result.overBought.length})`],
                            ['all', `📋 ทั้งหมด (${result.stats.length})`],
                        ] as [string, string][]).map(([key, label]) => (
                            <button key={key} onClick={() => setTab(key as typeof tab)}
                                style={{
                                    padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)',
                                    background: tab === key ? 'var(--accent)' : 'var(--white)',
                                    color: tab === key ? 'white' : 'var(--text)',
                                    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                                }}>{label}</button>
                        ))}
                    </div>

                    {/* Tab: Overview */}
                    {tab === 'overview' && an && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div className="card">
                                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>🚨 รายการปัญหาหลัก</h4>
                                {an.topProblems.slice(0, 5).map((p, i) => (
                                    <div key={i} style={{ background: 'rgba(220,38,38,0.05)', borderRadius: 8, padding: '0.6rem 0.875rem', marginBottom: 6, border: '1px solid rgba(220,38,38,0.15)' }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.82rem', color: '#dc2626' }}>{p.name}</p>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>⚠️ {p.issue}</p>
                                        <p style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: 2, fontWeight: 600 }}>→ {p.suggestion}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="card">
                                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>💡 คำแนะนำจาก AI</h4>
                                {an.recommendations.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                                        <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                                        <p style={{ fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.5 }}>{r}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab: Over-bought */}
                    {tab === 'overbought' && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {result.overBought.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem' }}>✅ ไม่มีรายการที่ซื้อเกินในช่วงนี้</p>
                                </div>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>สินค้า</th>
                                            <th style={{ textAlign: 'right' }}>ซื้อเข้า</th>
                                            <th style={{ textAlign: 'right' }}>ใช้จริง</th>
                                            <th style={{ textAlign: 'right' }}>เกิน</th>
                                            <th style={{ textAlign: 'center' }}>%เกิน</th>
                                            <th style={{ textAlign: 'right' }}>สต็อคปัจจุบัน</th>
                                            <th style={{ textAlign: 'center' }}>ครั้งที่ซื้อ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.overBought.map((s, i) => (
                                            <tr key={i} style={{ background: s.isNeverUsed ? 'rgba(220,38,38,0.04)' : undefined }}>
                                                <td>
                                                    <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</p>
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.sku}</p>
                                                    {s.isNeverUsed && <span style={{ fontSize: '0.68rem', background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>ไม่มียอดใช้เลย</span>}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.totalPurchased} {s.unit}</td>
                                                <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{s.totalUsed} {s.unit}</td>
                                                <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>+{s.surplus} {s.unit}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        background: `${surplusColor(s.surplusPercent)}15`,
                                                        color: surplusColor(s.surplusPercent),
                                                        fontWeight: 700, fontSize: '0.78rem',
                                                        padding: '3px 8px', borderRadius: 6
                                                    }}>{s.surplusPercent}%</span>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{s.currentStock} {s.unit}</td>
                                                <td style={{ textAlign: 'center', color: s.purchaseCount > 3 ? '#dc2626' : 'var(--text-muted)', fontWeight: s.purchaseCount > 3 ? 700 : 400 }}>{s.purchaseCount}x</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Tab: All */}
                    {tab === 'all' && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>สินค้า</th>
                                        <th style={{ textAlign: 'right' }}>ซื้อเข้า</th>
                                        <th style={{ textAlign: 'right' }}>ใช้จริง</th>
                                        <th style={{ textAlign: 'right' }}>เกิน/ขาด</th>
                                        <th style={{ textAlign: 'center' }}>สถานะ</th>
                                        <th style={{ textAlign: 'right' }}>สต็อคปัจจุบัน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.stats.map((s, i) => (
                                        <tr key={i}>
                                            <td>
                                                <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</p>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.sku} · {s.category}</p>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{s.totalPurchased} {s.unit}</td>
                                            <td style={{ textAlign: 'right', color: '#16a34a' }}>{s.totalUsed} {s.unit}</td>
                                            <td style={{ textAlign: 'right', color: s.surplus > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                                                {s.surplus > 0 ? '+' : ''}{s.surplus} {s.unit}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {s.isNeverUsed ? (
                                                    <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>ไม่มียอดใช้</span>
                                                ) : s.isOverBought ? (
                                                    <span style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>ซื้อเกิน {s.surplusPercent}%</span>
                                                ) : (
                                                    <span style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>✓ ปกติ</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{s.currentStock} {s.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
