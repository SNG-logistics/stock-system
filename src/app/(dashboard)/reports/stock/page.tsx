'use client'
import { useEffect, useState } from 'react'

interface InvItem {
    id: string; quantity: number; avgCost: number; updatedAt: string
    product: { sku: string; name: string; unit: string; reorderPoint: number; minQty: number; category: { name: string; color: string | null } }
    location: { code: string; name: string }
}

function fmtLAK(n: number) { return n.toLocaleString() + ' ₭' }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('th-TH') }

export default function StockReportPage() {
    const [data, setData] = useState<InvItem[]>([])
    const [loading, setLoading] = useState(true)
    const [locFilter, setLocFilter] = useState('')
    const [search, setSearch] = useState('')
    const [lowOnly, setLowOnly] = useState(false)

    async function load() {
        setLoading(true)
        const res = await fetch('/api/inventory?limit=2000')
        const json = await res.json()
        setData(json.data?.inventory || [])
        setLoading(false)
    }
    useEffect(() => { load() }, [])

    const locations = [...new Set(data.map(i => i.location.code))].sort()
    const filtered = data.filter(i => {
        if (locFilter && i.location.code !== locFilter) return false
        if (search && !i.product.name.toLowerCase().includes(search.toLowerCase()) && !i.product.sku.toLowerCase().includes(search.toLowerCase())) return false
        if (lowOnly && i.quantity > i.product.minQty) return false
        return true
    })

    const totalValue = filtered.reduce((s, i) => s + i.quantity * i.avgCost, 0)
    const lowCount = data.filter(i => i.quantity <= i.product.minQty && i.product.minQty > 0).length

    // Group by location
    const byLoc = locations.reduce((acc, loc) => {
        const items = data.filter(i => i.location.code === loc)
        acc[loc] = { name: items[0]?.location.name || loc, value: items.reduce((s, i) => s + i.quantity * i.avgCost, 0), count: items.length }
        return acc
    }, {} as Record<string, { name: string; value: number; count: number }>)

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">📦 สต็อครวม</h1>
                    <p className="page-subtitle">มูลค่าสต็อคทั้งหมดตามคลัง — คำนวณจาก WAC × จำนวนคงเหลือ</p>
                </div>
                <button onClick={load} className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>🔄 รีเฟรช</button>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10, marginBottom: 16 }}>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>มูลค่าสต็อครวม</p>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{fmtLAK(data.reduce((s, i) => s + i.quantity * i.avgCost, 0))}</p>
                </div>
                {Object.entries(byLoc).map(([code, info]) => (
                    <div key={code} className="stat-card" style={{ cursor: 'pointer', background: locFilter === code ? 'rgba(232,54,78,0.05)' : undefined }}
                        onClick={() => setLocFilter(locFilter === code ? '' : code)}>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: locFilter === code ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'monospace' }}>{code}</p>
                        <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{fmtLAK(info.value)}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{info.count} รายการ</p>
                    </div>
                ))}
                <div className="stat-card" style={{ borderColor: '#dc2626', cursor: 'pointer', background: lowOnly ? 'rgba(220,38,38,0.05)' : undefined }}
                    onClick={() => setLowOnly(!lowOnly)}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>ใกล้หมด</p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: 2 }}>{lowCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="input" style={{ flex: 1, fontSize: '0.82rem' }} placeholder="ค้นหาสินค้า / SKU..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ fontSize: '0.82rem', width: 160 }} value={locFilter} onChange={e => setLocFilter(e.target.value)}>
                    <option value="">ทุกคลัง</option>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-muted)' }}>⏳ กำลังโหลด...</p></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>แสดง {filtered.length} รายการ</p>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>มูลค่ารวม: {fmtLAK(totalValue)}</p>
                    </div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>สินค้า</th><th>คลัง</th>
                                <th style={{ textAlign: 'right' }}>คงเหลือ</th>
                                <th style={{ textAlign: 'right' }}>ราคาทุน/หน่วย</th>
                                <th style={{ textAlign: 'right' }}>มูลค่า</th>
                                <th style={{ textAlign: 'center' }}>สถานะ</th>
                                <th>อัพเดตล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(i => {
                                const isLow = i.quantity <= i.product.minQty && i.product.minQty > 0
                                const value = i.quantity * i.avgCost
                                return (
                                    <tr key={i.id} style={{ background: isLow ? 'rgba(220,38,38,0.03)' : undefined }}>
                                        <td>
                                            <p style={{ fontWeight: 600, fontSize: '0.84rem' }}>{i.product.name}</p>
                                            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{i.product.sku} · {i.product.category.name}</p>
                                        </td>
                                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{i.location.code}</span></td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{i.quantity} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{i.product.unit}</span></td>
                                        <td style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{i.avgCost.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>{fmtLAK(value)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isLow
                                                ? <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>⚠️ ใกล้หมด</span>
                                                : <span style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>✓ ปกติ</span>
                                            }
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmtDate(i.updatedAt)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
