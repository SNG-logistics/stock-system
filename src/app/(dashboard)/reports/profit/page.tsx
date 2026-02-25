'use client'
import { useEffect, useState } from 'react'

interface Product {
    id: string; sku: string; name: string; unit: string; costPrice: number; salePrice: number
    category: { name: string }
}

function fmtLAK(n: number) { return n.toLocaleString() + ' ₭' }
function gpColor(p: number) {
    if (p >= 60) return '#16a34a'
    if (p >= 40) return '#d97706'
    if (p >= 20) return '#dc2626'
    return '#6b7280'
}

export default function ProfitPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [sortBy, setSortBy] = useState<'gp' | 'name' | 'sale'>('gp')

    async function load() {
        setLoading(true)
        const res = await fetch('/api/products?limit=2000')
        const json = await res.json()
        setProducts((json.data?.products || []).filter((p: Product) => p.salePrice > 0))
        setLoading(false)
    }
    useEffect(() => { load() }, [])

    const categories = [...new Set(products.map(p => p.category?.name || 'อื่นๆ'))].sort()

    const filtered = products
        .filter(p => {
            if (catFilter && p.category?.name !== catFilter) return false
            if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false
            return true
        })
        .sort((a, b) => {
            const gpA = a.salePrice > 0 ? ((a.salePrice - a.costPrice) / a.salePrice) * 100 : 0
            const gpB = b.salePrice > 0 ? ((b.salePrice - b.costPrice) / b.salePrice) * 100 : 0
            if (sortBy === 'gp') return gpB - gpA
            if (sortBy === 'sale') return b.salePrice - a.salePrice
            return a.name.localeCompare(b.name, 'th')
        })

    const avgGP = filtered.length > 0
        ? filtered.reduce((s, p) => s + (p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0), 0) / filtered.length
        : 0

    const topProfit = [...filtered].sort((a, b) => (b.salePrice - b.costPrice) - (a.salePrice - a.costPrice)).slice(0, 3)

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">📊 Gross Profit</h1>
                    <p className="page-subtitle">กำไรขั้นต้นต่อสินค้า — คำนวณจาก (ราคาขาย - ต้นทุน) / ราคาขาย</p>
                </div>
            </div>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>GP เฉลี่ย</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 800, color: gpColor(avgGP), marginTop: 4 }}>{avgGP.toFixed(1)}%</p>
                </div>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>GP ≥ 60%</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                        {products.filter(p => p.salePrice > 0 && ((p.salePrice - p.costPrice) / p.salePrice) * 100 >= 60).length}
                    </p>
                </div>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>GP &lt; 30%</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                        {products.filter(p => p.salePrice > 0 && ((p.salePrice - p.costPrice) / p.salePrice) * 100 < 30).length}
                    </p>
                </div>
                <div className="stat-card">
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>สินค้ามีราคาขาย</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{products.length}</p>
                </div>
            </div>

            {/* Top 3 กำไรสูงสุด */}
            {topProfit.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                    {topProfit.map((p, i) => {
                        const gp = ((p.salePrice - p.costPrice) / p.salePrice) * 100
                        const gpBaht = p.salePrice - p.costPrice
                        return (
                            <div key={p.id} className="card" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.04), rgba(22,163,74,0.1))', border: '1px solid rgba(22,163,74,0.2)' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>#{i + 1} กำไรต่อหน่วยสูงสุด</p>
                                <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>{p.name}</p>
                                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{fmtLAK(gpBaht)}</p>
                                <p style={{ fontSize: '0.72rem', color: '#16a34a' }}>GP {gp.toFixed(1)}% · ขาย {fmtLAK(p.salePrice)}</p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Filters */}
            <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input className="input" style={{ flex: 1, minWidth: 180, fontSize: '0.82rem' }} placeholder="ค้นหาสินค้า..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ fontSize: '0.82rem', width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="">ทุกหมวด</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input" style={{ fontSize: '0.82rem', width: 150 }} value={sortBy} onChange={e => setSortBy(e.target.value as 'gp' | 'name' | 'sale')}>
                    <option value="gp">เรียงตาม GP%</option>
                    <option value="sale">เรียงตามราคาขาย</option>
                    <option value="name">เรียงตามชื่อ</option>
                </select>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-muted)' }}>⏳ กำลังโหลด...</p></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>สินค้า</th><th>หมวด</th>
                                <th style={{ textAlign: 'right' }}>ต้นทุน</th>
                                <th style={{ textAlign: 'right' }}>ราคาขาย</th>
                                <th style={{ textAlign: 'right' }}>กำไร/หน่วย</th>
                                <th style={{ textAlign: 'center', width: 140 }}>GP%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const gp = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0
                                const gpBaht = p.salePrice - p.costPrice
                                const color = gpColor(gp)
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <p style={{ fontWeight: 600, fontSize: '0.84rem' }}>{p.name}</p>
                                            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.sku}</p>
                                        </td>
                                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.category?.name || '—'}</td>
                                        <td style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.costPrice.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.salePrice.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color }}>+{gpBaht.toLocaleString()} ₭</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ flex: 1, height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ width: `${Math.min(100, gp)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>{gp.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        แสดง {filtered.length} รายการ · GP เฉลี่ย: <strong style={{ color: gpColor(avgGP) }}>{avgGP.toFixed(1)}%</strong>
                    </div>
                </div>
            )}
        </div>
    )
}
