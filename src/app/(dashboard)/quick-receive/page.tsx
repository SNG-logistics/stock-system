'use client'
import { useState, useRef, useEffect } from 'react'

const LOCATIONS = [
    { code: 'WH_FRESH', name: 'คลังของสด (WH_FRESH)' },
    { code: 'WH_MAIN', name: 'คลังใหญ่ (WH_MAIN)' },
    { code: 'WH_DRINKbar1', name: 'เครื่องดื่ม 1 (DRINKbar1)' },
    { code: 'WH_DRINKbar2', name: 'เครื่องดื่ม 2 (DRINKbar2)' },
    { code: 'FR_FREEZER', name: 'ตู้แช่ (FR_FREEZER)' },
    { code: 'KIT_STOCK', name: 'ครัว (KIT_STOCK)' },
    { code: 'BAR_STOCK', name: 'บาร์ (BAR_STOCK)' },
]

interface ProductSuggestion {
    sku: string
    name: string
    unit: string
}

export default function QuickReceivePage() {
    const [loc, setLoc] = useState('WH_FRESH')
    const [search, setSearch] = useState('')
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
    const [selected, setSelected] = useState<ProductSuggestion | null>(null)
    const [qty, setQty] = useState('')
    const [cost, setCost] = useState('')
    const [unit, setUnit] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState('')
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Search products
    useEffect(() => {
        if (selected) return
        if (search.length < 1) { setSuggestions([]); return }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/products/search?q=${encodeURIComponent(search)}&limit=6`)
                const data = await res.json()
                setSuggestions(data.products || [])
            } catch { setSuggestions([]) }
        }, 250)
    }, [search, selected])

    function selectProduct(p: ProductSuggestion) {
        setSelected(p)
        setSearch(p.name)
        setUnit(p.unit)
        setSuggestions([])
    }

    function clearSelection() {
        setSelected(null)
        setSearch('')
        setUnit('')
        setSuggestions([])
    }

    async function handleSubmit() {
        if (!search.trim() || !qty || parseFloat(qty) <= 0) {
            setError('กรุณากรอกชื่อสินค้าและจำนวนให้ครบ'); return
        }
        setLoading(true); setError('')
        try {
            const res = await fetch('/api/quick-receive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationCode: loc,
                    productSku: selected?.sku || null,
                    productName: selected ? null : search.trim(),
                    unit: unit || 'ชิ้น',
                    quantity: parseFloat(qty),
                    unitCost: cost ? parseFloat(cost) : 0,
                })
            })
            const json = await res.json()
            if (json.success) { setDone(true) }
            else setError(json.error || 'เกิดข้อผิดพลาด')
        } catch { setError('ไม่สามารถเชื่อมต่อได้') }
        finally { setLoading(false) }
    }

    function reset() {
        setDone(false); clearSelection(); setQty(''); setCost(''); setUnit(''); setError('')
    }

    const s: Record<string, React.CSSProperties> = {
        page: { minHeight: '100vh', background: '#F8FAFC', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
        card: { background: '#fff', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
        label: { display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginBottom: 6 },
        input: { width: '100%', padding: '0.8rem 1rem', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, color: '#111' },
        select: { width: '100%', padding: '0.8rem 1rem', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer', color: '#111' },
        btn: { width: '100%', padding: '1rem', border: 'none', borderRadius: 14, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 },
        sug: { position: 'absolute' as const, top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden' },
    }

    if (done) return (
        <div style={s.page}>
            <div style={{ ...s.card, textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
                <h2 style={{ fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>บันทึกสำเร็จ!</h2>
                <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>สินค้าถูกบันทึกเข้าคลังแล้ว</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button onClick={reset} style={{ ...s.btn, flex: 1, marginTop: 0 }}>+ รับสินค้าอีกรายการ</button>
                </div>
            </div>
        </div>
    )

    return (
        <div style={s.page}>
            <div style={s.card}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>📦</div>
                    <h1 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#111', marginBottom: 4 }}>Quick Receive</h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>รับสินค้าเข้าคลัง — พิมพ์ชื่อหรือสแกน SKU</p>
                </div>

                {/* Location */}
                <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>📦 รับเข้าคลัง</label>
                    <select value={loc} onChange={e => setLoc(e.target.value)} style={s.select}>
                        {LOCATIONS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                </div>

                {/* Product Search */}
                <div style={{ marginBottom: 14, position: 'relative' }}>
                    <label style={s.label}>🔍 ชื่อสินค้า / SKU</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            style={s.input}
                            value={search}
                            onChange={e => { setSearch(e.target.value); if (selected) clearSelection() }}
                            placeholder="เช่น ต้นหอม, Beer Lao, BL-LG..."
                            autoFocus
                        />
                        {selected && (
                            <button onClick={clearSelection} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18 }}>×</button>
                        )}
                    </div>
                    {!selected && suggestions.length > 0 && (
                        <div style={s.sug}>
                            {suggestions.map(p => (
                                <div key={p.sku} onClick={() => selectProduct(p)}
                                    style={{ padding: '0.7rem 1rem', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F0FDF4'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                                >
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111' }}>{p.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'monospace' }}>{p.sku} · {p.unit}</span>
                                </div>
                            ))}
                            {!selected && search.trim().length > 0 && (
                                <div onClick={() => { setSuggestions([]); setUnit('') }}
                                    style={{ padding: '0.7rem 1rem', cursor: 'pointer', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem', background: '#F0FDF4' }}>
                                    ➕ สร้างสินค้าใหม่: "{search.trim()}"
                                </div>
                            )}
                        </div>
                    )}
                    {selected && (
                        <div style={{ marginTop: 6, padding: '0.4rem 0.75rem', background: '#F0FDF4', borderRadius: 8, fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                            ✅ {selected.sku} — จะรับเข้าสต็อครายการที่มีอยู่
                        </div>
                    )}
                    {!selected && search.trim().length > 1 && suggestions.length === 0 && (
                        <div style={{ marginTop: 6, padding: '0.4rem 0.75rem', background: '#FFF7ED', borderRadius: 8, fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>
                            ⚡ จะสร้างสินค้าใหม่: "{search.trim()}"
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    {/* Qty */}
                    <div>
                        <label style={s.label}>📏 จำนวน</label>
                        <input type="number" inputMode="decimal" style={{ ...s.input, textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
                            value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
                    </div>
                    {/* Unit */}
                    <div>
                        <label style={s.label}>หน่วย (unit)</label>
                        <input style={s.input} value={unit} onChange={e => setUnit(e.target.value)}
                            placeholder={selected ? selected.unit : 'กก., ขวด, ชิ้น…'} />
                    </div>
                </div>

                {/* Cost */}
                <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>💰 ราคาต่อหน่วย (LAK) <span style={{ fontWeight: 400, color: '#9CA3AF' }}>— ไม่บังคับ</span></label>
                    <input type="number" inputMode="decimal" style={s.input}
                        value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
                </div>

                {error && <div style={{ padding: '0.75rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginBottom: 12, color: '#DC2626', fontSize: '0.85rem' }}>❌ {error}</div>}

                <button onClick={handleSubmit} disabled={loading || !search.trim() || !qty} style={{
                    ...s.btn,
                    background: (!search.trim() || !qty || loading) ? '#F3F4F6' : 'linear-gradient(135deg,#16a34a,#15803d)',
                    color: (!search.trim() || !qty || loading) ? '#9CA3AF' : '#fff',
                    cursor: (!search.trim() || !qty || loading) ? 'not-allowed' : 'pointer',
                    boxShadow: (!search.trim() || !qty || loading) ? 'none' : '0 4px 14px rgba(22,163,74,0.4)',
                }}>
                    {loading ? '⏳ กำลังบันทึก…' : '✅ บันทึกรับสินค้า'}
                </button>

                <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.7rem', color: '#D1D5DB' }}>
                    43 Garden · Quick Receive · ไม่ต้องมี QR ต่อสินค้า
                </p>
            </div>
        </div>
    )
}
