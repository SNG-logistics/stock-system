'use client'
import { useState, useMemo } from 'react'
import { STOCK_SHEET_TEMPLATE } from '@/lib/stock-sheet-template'

interface GridEntry {
    row: number
    quantityIn: number | ''
    costPerUnit: number | ''
}

interface ImportItem {
    name: string
    unit: string
    quantityIn: number
    costPerUnit: number
}

interface Props {
    onClose: () => void
    onImport: (items: ImportItem[], date: string) => void
}

export default function StockSheetGridModal({ onClose, onImport }: Props) {
    const today = new Date().toISOString().split('T')[0]
    const [date, setDate] = useState(today)
    const [entries, setEntries] = useState<Record<number, GridEntry>>({})
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!search.trim()) return STOCK_SHEET_TEMPLATE
        const q = search.toLowerCase()
        return STOCK_SHEET_TEMPLATE.filter(r =>
            r.name.toLowerCase().includes(q) || String(r.row).includes(q)
        )
    }, [search])

    const filledCount = Object.values(entries).filter(e => e.quantityIn !== '' && Number(e.quantityIn) > 0).length

    function setEntry(row: number, field: 'quantityIn' | 'costPerUnit', val: string) {
        setEntries(prev => ({
            ...prev,
            [row]: {
                row,
                quantityIn: prev[row]?.quantityIn ?? '',
                costPerUnit: prev[row]?.costPerUnit ?? '',
                [field]: val === '' ? '' : (parseFloat(val) ?? ''),
            },
        }))
    }

    function handleImport() {
        const items: ImportItem[] = []
        for (const row of STOCK_SHEET_TEMPLATE) {
            const e = entries[row.row]
            const qty = e ? Number(e.quantityIn) : 0
            if (!qty || qty <= 0) continue
            items.push({
                name: row.name,
                unit: row.unit,
                quantityIn: qty,
                costPerUnit: e ? Number(e.costPerUnit) || 0 : 0,
            })
        }
        if (items.length === 0) return
        onImport(items, date)
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '0.5rem', backdropFilter: 'blur(6px)' }}>
            <div style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '95vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>📋 กรอกใบสต็อคของสด</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>กรอกเฉพาะแถวที่รับสินค้าเข้า — ว่างเปล่า = ไม่ได้รับ</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)' }}>✕</button>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>วันที่:</span>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="input" style={{ fontSize: '0.82rem', padding: '4px 8px', width: 140 }} />
                    </div>
                    <input
                        placeholder="🔍 ค้นหาชื่อ / เลขแถว"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="input" style={{ fontSize: '0.82rem', flex: 1, minWidth: 140, padding: '4px 8px' }}
                    />
                    {filledCount > 0 && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(5,150,105,0.12)', color: '#059669', borderRadius: 20, padding: '3px 10px', fontWeight: 700 }}>
                            ✓ {filledCount} รายการ
                        </span>
                    )}
                </div>

                {/* Column Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 90px 110px', gap: 6, padding: '0.45rem 1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    {['#', 'ชื่อวัตถุดิบ', 'หน่วย', 'รับเข้า', 'ราคา/หน่วย'].map(h => (
                        <span key={h} style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                    ))}
                </div>

                {/* Rows */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {filtered.map(row => {
                            const e = entries[row.row]
                            const hasQty = e?.quantityIn !== '' && Number(e?.quantityIn) > 0
                            return (
                                <div key={row.row} style={{
                                    display: 'grid', gridTemplateColumns: '36px 1fr 60px 90px 110px',
                                    gap: 6, alignItems: 'center',
                                    padding: '4px 4px',
                                    borderRadius: 8,
                                    background: hasQty ? 'rgba(5,150,105,0.05)' : 'transparent',
                                    border: hasQty ? '1px solid rgba(5,150,105,0.2)' : '1px solid transparent',
                                }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>{row.row}</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: hasQty ? 700 : 400, color: hasQty ? '#059669' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.name}>{row.name}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>{row.unit}</span>
                                    <input
                                        type="number" min={0} step={0.001} placeholder="0"
                                        value={e?.quantityIn ?? ''}
                                        onChange={ev => setEntry(row.row, 'quantityIn', ev.target.value)}
                                        style={{
                                            fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right', width: '100%',
                                            border: `1px solid ${hasQty ? 'rgba(5,150,105,0.4)' : 'var(--border)'}`,
                                            borderRadius: 6, background: 'var(--white)', fontFamily: 'inherit',
                                            fontWeight: hasQty ? 700 : 400, color: hasQty ? '#059669' : 'var(--text)',
                                        }}
                                    />
                                    <input
                                        type="number" min={0} step={1} placeholder="0"
                                        value={e?.costPerUnit ?? ''}
                                        onChange={ev => setEntry(row.row, 'costPerUnit', ev.target.value)}
                                        style={{
                                            fontSize: '0.82rem', padding: '4px 6px', textAlign: 'right', width: '100%',
                                            border: '1px solid var(--border)', borderRadius: 6,
                                            background: 'var(--white)', fontFamily: 'inherit',
                                        }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={filledCount === 0}
                        style={{
                            flex: 2, padding: '0.65rem', borderRadius: 10, border: 'none',
                            background: filledCount > 0 ? 'linear-gradient(135deg,#059669,#10B981)' : 'var(--border)',
                            color: filledCount > 0 ? '#fff' : 'var(--text-muted)',
                            fontWeight: 700, cursor: filledCount > 0 ? 'pointer' : 'default',
                            fontFamily: 'inherit', boxShadow: filledCount > 0 ? '0 4px 16px rgba(5,150,105,0.3)' : 'none',
                            transition: 'all 0.2s',
                        }}>
                        ✅ นำเข้า {filledCount > 0 ? `(${filledCount} รายการ)` : ''}
                    </button>
                </div>
            </div>
        </div>
    )
}
