'use client'
import { useEffect, useState } from 'react'

interface PO {
    id: string; poNumber: string; totalAmount: number; status: string
    purchaseDate: string; createdAt: string; note: string | null
    supplier: { name: string } | null
    createdBy: { name: string } | null
    _count: { items: number }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'ร่าง', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    CONFIRMED: { label: 'ยืนยันแล้ว', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    RECEIVED: { label: 'รับแล้ว', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
    CANCELLED: { label: 'ยกเลิก', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
}

function fmtLAK(n: number) { return n.toLocaleString() + ' ₭' }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('th-TH', { dateStyle: 'medium' }) }

export default function PurchaseReportPage() {
    const [data, setData] = useState<{ orders: PO[]; total: number }>({ orders: [], total: 0 })
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)

    async function load(p = page) {
        setLoading(true)
        const res = await fetch(`/api/purchase?page=${p}&limit=30`)
        const json = await res.json()
        setData(json.data || { orders: [], total: 0 })
        setLoading(false)
    }
    useEffect(() => { load() }, [page])

    const totalValue = data.orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.totalAmount, 0)
    const pages = Math.ceil(data.total / 30)

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">🛒 รายงานการซื้อเข้า</h1>
                    <p className="page-subtitle">ใบสั่งซื้อทั้งหมด (PO) — {data.total} รายการ</p>
                </div>
            </div>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PO ทั้งหมด</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{data.total}</p>
                </div>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>มูลค่าหน้านี้</p>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{fmtLAK(totalValue)}</p>
                </div>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>รับสินค้าแล้ว</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                        {data.orders.filter(o => o.status === 'RECEIVED').length}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-muted)' }}>⏳ กำลังโหลด...</p></div>
            ) : (
                <>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>เลข PO</th><th>วันที่ซื้อ</th><th>ซัพพลายเออร์</th>
                                    <th style={{ textAlign: 'center' }}>รายการ</th>
                                    <th style={{ textAlign: 'right' }}>มูลค่า</th>
                                    <th style={{ textAlign: 'center' }}>สถานะ</th>
                                    <th>ผู้สร้าง</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.orders.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>ยังไม่มีใบสั่งซื้อ</td></tr>
                                ) : data.orders.map(po => {
                                    const s = STATUS_MAP[po.status] || { label: po.status, color: '#6b7280', bg: '#f3f4f6' }
                                    return (
                                        <tr key={po.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{po.poNumber}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{fmtDate(po.purchaseDate)}</td>
                                            <td style={{ fontSize: '0.82rem' }}>{po.supplier?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{po._count.items}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmtLAK(po.totalAmount)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>{s.label}</span>
                                            </td>
                                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{po.createdBy?.name || '—'}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {pages > 1 && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary" style={{ fontSize: '0.8rem' }}>← ก่อนหน้า</button>
                            <span style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>หน้า {page}/{pages}</span>
                            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary" style={{ fontSize: '0.8rem' }}>ถัดไป →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
