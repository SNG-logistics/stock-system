'use client'
import { useEffect, useState } from 'react'

interface Movement {
    id: string; type: string; quantity: number; unitCost: number; totalCost: number
    note: string | null; createdAt: string; referenceType: string | null
    product: { name: string; sku: string; unit: string }
    fromLocation: { name: string; code: string } | null
    toLocation: { name: string; code: string } | null
    createdBy: { name: string } | null
}

const TYPE_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    PURCHASE: { label: 'ซื้อเข้า', color: '#16a34a', bg: 'rgba(22,163,74,0.1)', icon: '🛒' },
    SALE: { label: 'ขายออก', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: '💰' },
    TRANSFER: { label: 'โอนย้าย', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: '🔄' },
    ADJUSTMENT: { label: 'ปรับสต็อค', color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: '✏️' },
    WASTE: { label: 'ของเสีย', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '🗑️' },
    OPENING: { label: 'สต็อคเปิด', color: '#0891b2', bg: 'rgba(8,145,178,0.1)', icon: '📦' },
    RETURN: { label: 'คืนสินค้า', color: '#0d9488', bg: 'rgba(13,148,136,0.1)', icon: '↩️' },
}

function fmtLAK(n: number) { return n > 0 ? n.toLocaleString() + ' ₭' : '-' }
function fmtDate(s: string) { return new Date(s).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) }

export default function MovementsPage() {
    const [data, setData] = useState<Movement[]>([])
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState('')
    const [search, setSearch] = useState('')
    const [limit, setLimit] = useState(100)

    async function load() {
        setLoading(true)
        const params = new URLSearchParams({ limit: limit.toString() })
        if (typeFilter) params.set('type', typeFilter)
        const res = await fetch(`/api/movements?${params}`)
        const json = await res.json()
        setData(json.data || [])
        setLoading(false)
    }

    useEffect(() => { load() }, [typeFilter, limit])

    const filtered = data.filter(m =>
        !search || m.product.name.toLowerCase().includes(search.toLowerCase()) || m.product.sku.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">🔄 การเคลื่อนไหวสต็อค</h1>
                    <p className="page-subtitle">ประวัติ stock movement ทุกรายการ — ซื้อ, ขาย, โอน, ปรับ, เสีย</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input className="input" style={{ flex: 1, minWidth: 180, fontSize: '0.82rem' }}
                    placeholder="ค้นหาสินค้า..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ fontSize: '0.82rem', width: 150 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="">ทุกประเภท</option>
                    {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
                <select className="input" style={{ fontSize: '0.82rem', width: 120 }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
                    <option value={50}>50 รายการ</option>
                    <option value={100}>100 รายการ</option>
                    <option value={500}>500 รายการ</option>
                </select>
                <button onClick={load} className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>🔄 รีเฟรช</button>
            </div>

            {/* Summary chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {Object.entries(TYPE_MAP).map(([k, v]) => {
                    const count = data.filter(m => m.type === k).length
                    if (count === 0) return null
                    return (
                        <button key={k} onClick={() => setTypeFilter(typeFilter === k ? '' : k)}
                            style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${v.color}40`, background: typeFilter === k ? v.bg : 'var(--white)', color: v.color, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                            {v.icon} {v.label} ({count})
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-muted)' }}>⏳ กำลังโหลด...</p></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>วันที่</th><th>ประเภท</th><th>สินค้า</th>
                                <th>จาก → ไป</th><th style={{ textAlign: 'right' }}>จำนวน</th>
                                <th style={{ textAlign: 'right' }}>ต้นทุน/หน่วย</th><th style={{ textAlign: 'right' }}>รวม</th>
                                <th>หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>ไม่มีข้อมูล</td></tr>
                            ) : filtered.map(m => {
                                const t = TYPE_MAP[m.type] || { label: m.type, color: '#6b7280', bg: '#f3f4f6', icon: '•' }
                                return (
                                    <tr key={m.id}>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(m.createdAt)}</td>
                                        <td><span style={{ background: t.bg, color: t.color, padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>{t.icon} {t.label}</span></td>
                                        <td>
                                            <p style={{ fontWeight: 600, fontSize: '0.83rem' }}>{m.product.name}</p>
                                            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.product.sku}</p>
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {m.fromLocation?.code || '—'} → {m.toLocation?.code || '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: ['SALE', 'WASTE'].includes(m.type) ? '#dc2626' : '#16a34a' }}>
                                            {['SALE', 'WASTE'].includes(m.type) ? '-' : '+'}{m.quantity} {m.product.unit}
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: '0.78rem' }}>{fmtLAK(m.unitCost)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.82rem' }}>{fmtLAK(m.totalCost)}</td>
                                        <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 180 }}>{m.note || m.referenceType || ''}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        แสดง {filtered.length} จาก {data.length} รายการ
                    </div>
                </div>
            )}
        </div>
    )
}
