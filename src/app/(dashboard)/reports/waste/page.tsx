'use client'
import { useEffect, useState } from 'react'

interface WasteEntry {
    id: string; type: string; quantity: number; unitCost: number; totalCost: number
    note: string | null; createdAt: string
    product: { name: string; sku: string; unit: string; category: { name: string } }
    fromLocation: { code: string; name: string } | null
    createdBy: { name: string } | null
}

function fmtLAK(n: number) { return n.toLocaleString() + ' ₭' }
function fmtDate(s: string) { return new Date(s).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) }

export default function WasteReportPage() {
    const [data, setData] = useState<WasteEntry[]>([])
    const [loading, setLoading] = useState(true)

    async function load() {
        setLoading(true)
        const res = await fetch('/api/movements?type=WASTE&limit=500')
        const json = await res.json()
        setData(json.data || [])
        setLoading(false)
    }
    useEffect(() => { load() }, [])

    const totalCost = data.reduce((s, d) => s + d.totalCost, 0)
    const totalQty = data.reduce((s, d) => s + d.quantity, 0)

    // Group by category
    const byCategory = data.reduce((acc, d) => {
        const cat = d.product.category?.name || 'อื่นๆ'
        if (!acc[cat]) acc[cat] = { count: 0, totalCost: 0 }
        acc[cat].count++
        acc[cat].totalCost += d.totalCost
        return acc
    }, {} as Record<string, { count: number; totalCost: number }>)

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">🗑️ รายงานของเสีย</h1>
                    <p className="page-subtitle">บันทึก WASTE ทั้งหมด — มูลค่าสูญเสียสะสม</p>
                </div>
            </div>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>รายการของเสียทั้งหมด</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{data.length}</p>
                </div>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>มูลค่าสูญเสียรวม</p>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{fmtLAK(totalCost)}</p>
                </div>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ปริมาณรวม</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>{totalQty.toFixed(2)}</p>
                </div>
            </div>

            {/* By Category */}
            {Object.keys(byCategory).length > 0 && (
                <div className="card" style={{ marginBottom: 14 }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10 }}>แยกตามหมวดหมู่</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(byCategory).sort((a, b) => b[1].totalCost - a[1].totalCost).map(([cat, info]) => (
                            <div key={cat} style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 8, padding: '0.4rem 0.875rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626' }}>{cat}</p>
                                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{info.count} รายการ · {fmtLAK(info.totalCost)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-muted)' }}>⏳ กำลังโหลด...</p></div>
            ) : data.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                    <p style={{ fontWeight: 700 }}>ยังไม่มีบันทึกของเสีย</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>บันทึก WASTE ผ่านหน้า Adjustment → เลือก type ของเสีย</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>วันที่</th><th>สินค้า</th><th>คลัง</th>
                                <th style={{ textAlign: 'right' }}>จำนวน</th>
                                <th style={{ textAlign: 'right' }}>ต้นทุน/หน่วย</th>
                                <th style={{ textAlign: 'right' }}>มูลค่าสูญ</th>
                                <th>หมายเหตุ</th>
                                <th>บันทึกโดย</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(d => (
                                <tr key={d.id}>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(d.createdAt)}</td>
                                    <td>
                                        <p style={{ fontWeight: 600, fontSize: '0.84rem' }}>{d.product.name}</p>
                                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.product.sku}</p>
                                    </td>
                                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{d.fromLocation?.code || '—'}</span></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{d.quantity} {d.product.unit}</td>
                                    <td style={{ textAlign: 'right', fontSize: '0.78rem' }}>{d.unitCost.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmtLAK(d.totalCost)}</td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.note || '—'}</td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.createdBy?.name || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg)' }}>
                                <td colSpan={5} style={{ fontWeight: 700, fontSize: '0.85rem', padding: '0.6rem 1rem', textAlign: 'right' }}>รวมมูลค่าสูญเสีย:</td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626', padding: '0.6rem 1rem' }}>{fmtLAK(totalCost)}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    )
}
