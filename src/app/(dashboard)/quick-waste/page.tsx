'use client'
import { useState } from 'react'

const LOCATIONS = [
    { code: 'WH_FRESH', name: 'คลังของสด (WH_FRESH)' },
    { code: 'WH_MAIN', name: 'คลังใหญ่ (WH_MAIN)' },
    { code: 'WH_DRINKbar1', name: 'เครื่องดื่ม 1 (DRINKbar1)' },
    { code: 'WH_DRINKbar2', name: 'เครื่องดื่ม 2 (DRINKbar2)' },
    { code: 'FR_FREEZER', name: 'ตู้แช่ (FR_FREEZER)' },
    { code: 'KIT_STOCK', name: 'ครัว (KIT_STOCK)' },
    { code: 'BAR_STOCK', name: 'บาร์ (BAR_STOCK)' },
]

export default function QuickWastePage() {
    const [loc, setLoc] = useState('KIT_STOCK')
    const [name, setName] = useState('')
    const [qty, setQty] = useState('')
    const [unit, setUnit] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit() {
        if (!name.trim() || !qty || parseFloat(qty) <= 0) {
            setError('กรุณากรอกข้อมูลให้ครบ'); return
        }
        setLoading(true); setError('')
        try {
            const res = await fetch('/api/quick-waste', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationCode: loc, productName: name.trim(), quantity: parseFloat(qty), unit, reason })
            })
            const json = await res.json()
            if (json.success) setDone(true)
            else setError(json.error || 'เกิดข้อผิดพลาด')
        } catch { setError('ไม่สามารถเชื่อมต่อได้') }
        finally { setLoading(false) }
    }

    const s: Record<string, React.CSSProperties> = {
        page: { minHeight: '100vh', background: '#FFF7F7', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
        card: { background: '#fff', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
        input: { width: '100%', padding: '0.8rem 1rem', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const },
        label: { display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginBottom: 6 },
        select: { width: '100%', padding: '0.8rem 1rem', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit', background: '#fff' },
        btn: { width: '100%', padding: '1rem', border: 'none', borderRadius: 14, background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 },
    }

    if (done) return (
        <div style={s.page}>
            <div style={{ ...s.card, textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>🗑️</div>
                <h2 style={{ fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>บันทึก Waste สำเร็จ</h2>
                <button onClick={() => { setDone(false); setName(''); setQty(''); setUnit(''); setReason(''); setError('') }}
                    style={{ ...s.btn, marginTop: 16 }}>+ บันทึก Waste อีกรายการ</button>
            </div>
        </div>
    )

    return (
        <div style={s.page}>
            <div style={s.card}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#dc2626,#b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px', boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}>🗑️</div>
                    <h1 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#111', marginBottom: 4 }}>Quick Waste</h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>บันทึกของเสีย / สูญหาย</p>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>📦 คลังที่ตัดออก</label>
                    <select value={loc} onChange={e => setLoc(e.target.value)} style={s.select}>
                        {LOCATIONS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>🔍 ชื่อสินค้า / SKU</label>
                    <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อสินค้า…" autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                        <label style={s.label}>📏 จำนวนที่เสีย</label>
                        <input type="number" inputMode="decimal" style={{ ...s.input, textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
                            value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                        <label style={s.label}>หน่วย</label>
                        <input style={s.input} value={unit} onChange={e => setUnit(e.target.value)} placeholder="กก., ชิ้น…" />
                    </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>📝 สาเหตุ <span style={{ fontWeight: 400, color: '#9CA3AF' }}>— ไม่บังคับ</span></label>
                    <input style={s.input} value={reason} onChange={e => setReason(e.target.value)} placeholder="หมดอายุ, ตกแตก, สัตว์กิน…" />
                </div>
                {error && <div style={{ padding: '0.75rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, marginBottom: 12, color: '#DC2626', fontSize: '0.85rem' }}>❌ {error}</div>}
                <button onClick={handleSubmit} disabled={loading || !name.trim() || !qty} style={{
                    ...s.btn,
                    background: (!name.trim() || !qty || loading) ? '#F3F4F6' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                    color: (!name.trim() || !qty || loading) ? '#9CA3AF' : '#fff',
                    cursor: (!name.trim() || !qty || loading) ? 'not-allowed' : 'pointer',
                }}>
                    {loading ? '⏳ กำลังบันทึก…' : '🗑️ บันทึก Waste'}
                </button>
                <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.7rem', color: '#D1D5DB' }}>43 Garden · Quick Waste</p>
            </div>
        </div>
    )
}
