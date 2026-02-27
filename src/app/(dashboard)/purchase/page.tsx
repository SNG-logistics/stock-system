'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { formatLAK } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Product { id: string; sku: string; name: string; unit: string; costPrice: number }
interface Location { id: string; code: string; name: string }
interface PurchaseItem { productId: string; productName: string; unit: string; locationId: string; quantity: number; unitCost: number }
interface ScannedItem { name: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }
interface ScanResult { supplier: string | null; billDate: string | null; items: ScannedItem[]; totalAmount: number; notes: string | null }
interface StockSheetItem { name: string; unit: string; quantityIn: number; costPerUnit: number; totalCost: number; remaining: number | null }
interface StockSheetResult { sheetDate: string | null; items: StockSheetItem[] }

// ---- Product Combobox ----
function ProductCombobox({ products, value, onChange }: {
    products: Product[]
    value: string
    onChange: (p: Product) => void
}) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const selected = products.find(p => p.id === value)
    const displayValue = open ? query : (selected ? `${selected.name}` : '')
    const filtered = query.length === 0
        ? products.slice(0, 40)
        : products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 30)

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false); setQuery('')
            }
        }
        document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [])

    return (
        <div ref={ref} style={{ position: 'relative', width: '100%' }}>
            <input
                type="text" className="input"
                placeholder="🔍 พิมพ์ชื่อ หรือ SKU..."
                value={displayValue}
                style={{ fontSize: '0.83rem', width: '100%' }}
                onFocus={() => { setOpen(true); setQuery('') }}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
            />
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300,
                    background: 'var(--white)', border: '1px solid var(--border)',
                    borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
                    maxHeight: 250, overflowY: 'auto',
                }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ไม่พบสินค้า</div>
                    ) : filtered.map(p => (
                        <div key={p.id}
                            onMouseDown={() => { onChange(p); setOpen(false); setQuery('') }}
                            style={{
                                padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.83rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: p.id === value ? 'var(--accent-bg)' : 'transparent',
                                borderBottom: '1px solid var(--border-light)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = p.id === value ? 'var(--accent-bg)' : 'transparent')}
                        >
                            <span style={{ fontWeight: p.id === value ? 700 : 400, color: 'var(--text)' }}>{p.name}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8 }}>{p.sku} · {p.unit}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Stock Sheet Scanner Modal ──────────────────────────────────────────────
function StockSheetScannerModal({ onClose, onImport }: {
    onClose: () => void
    onImport: (result: { sheetDate: string | null; items: { name: string; unit: string; quantityIn: number; costPerUnit: number; totalCost: number; remaining: number | null }[] }) => void
}) {
    const [mode, setMode] = useState<'choose' | 'camera' | 'preview'>('choose')
    const [imageData, setImageData] = useState<string | null>(null)
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<{ sheetDate: string | null; items: { name: string; unit: string; quantityIn: number; costPerUnit: number; totalCost: number; remaining: number | null }[] } | null>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const galleryInputRef = useRef<HTMLInputElement>(null)

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return
        const reader = new FileReader()
        reader.onload = ev => { setImageData(ev.target?.result as string); setMode('preview') }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const scan = async () => {
        if (!imageData) return
        setScanning(true)
        try {
            const res = await fetch('/api/ai/scan-stock-sheet', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            })
            const json = await res.json()
            if (json.success) setResult(json.data)
            else toast.error(json.error || 'อ่านใบสต็อคไม่สำเร็จ')
        } catch { toast.error('เกิดข้อผิดพลาด') }
        finally { setScanning(false) }
    }

    const reset = () => { setImageData(null); setResult(null); setMode('choose') }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '0.75rem', backdropFilter: 'blur(6px)' }}>
            <div style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '95vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>📋 AI อ่านใบสต็อคของสด</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>ถ่ายรูปใบสต็อค — AI จะอ่านรายการรับเข้าให้อัตโนมัติ</div>
                    </div>
                    <button onClick={() => { onClose() }} style={{ background: 'var(--bg)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)' }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                    {mode === 'choose' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {[
                                { icon: '📷', label: 'ถ่ายรูป\n(กล้องหลัง)', color: '#059669', ref: cameraInputRef },
                                { icon: '🖼️', label: 'อัปโหลดรูป\nจากอัลบั้ม', color: '#7C3AED', ref: galleryInputRef },
                            ].map(b => (
                                <button key={b.icon} onClick={() => b.ref.current?.click()} style={{ padding: '2rem 1rem', borderRadius: 14, border: '2px dashed var(--border)', background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.18s', minHeight: 130 }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.background = `${b.color}10` }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}>
                                    <span style={{ fontSize: '2.5rem' }}>{b.icon}</span>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{b.label}</span>
                                </button>
                            ))}
                            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChange} />
                            <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
                        </div>
                    )}



                    {mode === 'preview' && !result && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {imageData && <img src={imageData} alt="stock sheet" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={reset} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>🔄 ถ่ายใหม่</button>
                                <button onClick={scan} disabled={scanning} style={{ flex: 2, padding: '0.65rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#10B981)', color: '#fff', fontWeight: 700, cursor: scanning ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: scanning ? 0.7 : 1 }}>
                                    {scanning ? '⏳ AI กำลังอ่านใบสต็อค...' : '🤖 ให้ AI อ่านใบสต็อค'}
                                </button>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div>
                            <div style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: '1.5rem' }}>✅</span>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.88rem' }}>AI อ่านใบสต็อคสำเร็จ — พบ {result.items.length} รายการ</div>
                                    {result.sheetDate && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>วันที่: {result.sheetDate}</div>}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 90px', gap: 6, padding: '0 4px', marginBottom: 2 }}>
                                    {['ชื่อ', 'หน่วย', 'รับเข้า', 'ราคา/หน่วย'].map(h => (
                                        <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                                    ))}
                                </div>
                                {result.items.map((item, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 90px', gap: 6, alignItems: 'center', background: 'var(--bg)', borderRadius: 10, padding: '0.5rem 0.6rem', border: `1px solid ${item.quantityIn > 0 ? 'var(--border)' : 'rgba(239,68,68,0.2)'}` }}>
                                        <input
                                            value={item.name}
                                            onChange={e => {
                                                const updated = [...result.items]
                                                updated[i] = { ...updated[i], name: e.target.value }
                                                setResult({ ...result, items: updated })
                                            }}
                                            style={{ fontSize: '0.82rem', padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--white)', fontFamily: 'inherit', width: '100%', fontWeight: 600 }}
                                        />
                                        <input
                                            value={item.unit}
                                            onChange={e => {
                                                const updated = [...result.items]
                                                updated[i] = { ...updated[i], unit: e.target.value }
                                                setResult({ ...result, items: updated })
                                            }}
                                            style={{ fontSize: '0.78rem', padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--white)', fontFamily: 'inherit', width: '100%' }}
                                        />
                                        <input type="number" min={0} step={0.001}
                                            value={item.quantityIn}
                                            onChange={e => {
                                                const updated = [...result.items]
                                                updated[i] = { ...updated[i], quantityIn: parseFloat(e.target.value) || 0 }
                                                setResult({ ...result, items: updated })
                                            }}
                                            style={{ fontSize: '0.82rem', padding: '3px 6px', border: `1px solid ${item.quantityIn > 0 ? 'var(--border)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 6, background: 'var(--white)', fontFamily: 'inherit', textAlign: 'right', width: '100%', fontWeight: 700, color: item.quantityIn > 0 ? '#059669' : '#EF4444' }}
                                        />
                                        <input type="number" min={0} step={1}
                                            value={item.costPerUnit}
                                            onChange={e => {
                                                const updated = [...result.items]
                                                updated[i] = { ...updated[i], costPerUnit: parseFloat(e.target.value) || 0, totalCost: (parseFloat(e.target.value) || 0) * item.quantityIn }
                                                setResult({ ...result, items: updated })
                                            }}
                                            style={{ fontSize: '0.78rem', padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--white)', fontFamily: 'inherit', textAlign: 'right', width: '100%' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={reset} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>🔄 สแกนใหม่</button>
                                <button onClick={() => onImport(result)} style={{ flex: 2, padding: '0.65rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#10B981)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                                    ✅ นำเข้ารายการ ({result.items.filter(i => i.quantityIn > 0).length})
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
// ---- AI Bill Scanner Modal ----
function BillScannerModal({
    onClose, onImport,
}: {
    onClose: () => void
    onImport: (result: ScanResult) => void
    defaultLocationId: string
}) {
    const [mode, setMode] = useState<'choose' | 'camera' | 'preview'>('choose')
    const [imageData, setImageData] = useState<string | null>(null)
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<ScanResult | null>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            setImageData(ev.target?.result as string)
            setMode('preview')
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const scan = async () => {
        if (!imageData) return
        setScanning(true)
        try {
            const res = await fetch('/api/purchase/scan-bill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            })
            const json = await res.json()
            if (json.success) {
                setResult(json.data)
            } else {
                toast.error(json.error || 'อ่านบิลไม่สำเร็จ')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setScanning(false)
        }
    }

    const reset = () => {
        setImageData(null)
        setResult(null)
        setMode('choose')
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 500, padding: '0.75rem', backdropFilter: 'blur(6px)',
        }}>
            <div style={{
                background: 'var(--white)', borderRadius: 18,
                width: '100%', maxWidth: 560, maxHeight: '95vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>📷 AI อ่านบิล</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>ถ่ายหรืออัปโหลดรูปบิล — AI จะอ่านรายการให้อัตโนมัติ</div>
                    </div>
                    <button onClick={() => onClose()}
                        style={{ background: 'var(--bg)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)' }}>
                        ✕
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

                    {/* ── CHOOSE ── */}
                    {mode === 'choose' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <button onClick={() => cameraInputRef.current?.click()} style={{
                                padding: '2rem 1rem', borderRadius: 14, border: '2px dashed var(--border)',
                                background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                transition: 'all 0.18s', minHeight: 130,
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
                            >
                                <span style={{ fontSize: '2.5rem' }}>📷</span>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{'ถ่ายรูปบิล\n(กล้องหลัง)'}</span>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} style={{
                                padding: '2rem 1rem', borderRadius: 14, border: '2px dashed var(--border)',
                                background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                transition: 'all 0.18s', minHeight: 130,
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = 'rgba(37,99,235,0.05)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
                            >
                                <span style={{ fontSize: '2.5rem' }}>🖼️</span>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{'อัปโหลดรูป\nจากอัลบั้ม'}</span>
                            </button>
                            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChange} />
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
                        </div>
                    )}

                    {/* ── PREVIEW ── */}
                    {mode === 'preview' && !result && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            {imageData && (
                                <img src={imageData} alt="bill" style={{
                                    width: '100%', maxHeight: 360, objectFit: 'contain',
                                    borderRadius: 12, border: '1px solid var(--border)',
                                }} />
                            )}
                            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                                <button onClick={reset} className="btn-outline" style={{ flex: 1 }}>🔄 ถ่ายใหม่</button>
                                <button onClick={scan} disabled={scanning} style={{
                                    flex: 2, padding: '0.7rem', borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
                                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                                    cursor: scanning ? 'wait' : 'pointer', fontFamily: 'inherit',
                                    boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                                    opacity: scanning ? 0.7 : 1,
                                }}>
                                    {scanning ? '⏳ AI กำลังอ่านบิล...' : '🤖 ให้ AI อ่านบิล'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── RESULT ── */}
                    {result && (
                        <div>
                            <div style={{
                                background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)',
                                borderRadius: 12, padding: '0.85rem 1rem', marginBottom: 14,
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>✅</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.88rem' }}>AI อ่านบิลสำเร็จ — พบ {result.items.length} รายการ</div>
                                    {result.supplier && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ซัพพลายเออร์: {result.supplier}</div>}
                                    {result.billDate && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>วันที่บิล: {result.billDate}</div>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ยอดรวม</div>
                                    <div style={{ fontWeight: 800, color: '#16a34a' }}>{formatLAK(result.totalAmount)}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    รายการที่พบ
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {result.items.map((item, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            background: 'var(--bg)', borderRadius: 10,
                                            padding: '0.6rem 0.85rem', border: '1px solid var(--border)',
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    {item.quantity} {item.unit} × {formatLAK(item.unitPrice)}
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                                                {formatLAK(item.totalPrice)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {result.notes && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, padding: '0.5rem', background: 'var(--bg)', borderRadius: 8 }}>
                                        💬 {result.notes}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={reset} className="btn-outline" style={{ flex: 1 }}>🔄 สแกนใหม่</button>
                                <button onClick={() => onImport(result)} style={{
                                    flex: 2, padding: '0.7rem', borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg, #059669, #10B981)',
                                    color: '#fff', fontWeight: 700, fontSize: '0.92rem',
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
                                }}>
                                    ✅ นำเข้ารายการ ({result.items.length} รายการ)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ---- Main Page ----
export default function PurchasePage() {
    const [products, setProducts] = useState<Product[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [items, setItems] = useState<PurchaseItem[]>([])
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [tab, setTab] = useState<'new' | 'history'>('new')
    const [orders, setOrders] = useState<unknown[]>([])
    const [showScanner, setShowScanner] = useState(false)
    const [showStockSheet, setShowStockSheet] = useState(false)

    useEffect(() => {
        fetch('/api/products?limit=500').then(r => r.json()).then(j => j.success && setProducts(j.data.products))
        fetch('/api/locations').then(r => r.json()).then(j => j.success && setLocations(j.data))
        fetchOrders()
    }, [])

    async function fetchOrders() {
        const res = await fetch('/api/purchase')
        const json = await res.json()
        if (json.success) setOrders(json.data.orders)
    }

    function addItem() {
        if (locations.length === 0) return
        const defLoc = locations.find(l => l.code === 'WH_MAIN') || locations[0]
        setItems([...items, { productId: '', productName: '', unit: '', locationId: defLoc.id, quantity: 1, unitCost: 0 }])
    }

    function selectProduct(i: number, p: Product) {
        const newItems = [...items]
        newItems[i] = { ...newItems[i], productId: p.id, productName: p.name, unit: p.unit, unitCost: p.costPrice }
        setItems(newItems)
    }

    function updateItem(i: number, field: string, value: unknown) {
        const newItems = [...items]
            ; (newItems[i] as unknown as Record<string, unknown>)[field] = value
        setItems(newItems)
    }

    function handleScanImport(result: ScanResult) {
        const defLoc = locations.find(l => l.code === 'WH_MAIN') || locations[0]
        if (!defLoc) return

        const newItems: PurchaseItem[] = result.items.map(si => {
            const matched = products.find(p =>
                p.name.toLowerCase().includes(si.name.toLowerCase()) ||
                si.name.toLowerCase().includes(p.name.toLowerCase())
            )
            return {
                productId: matched?.id || '',
                productName: matched?.name || si.name,
                unit: matched?.unit || si.unit,
                locationId: defLoc.id,
                quantity: si.quantity,
                unitCost: si.unitPrice,
            }
        })

        setItems(prev => [...prev, ...newItems])
        if (result.supplier) setNote(result.supplier)
        if (result.billDate) setPurchaseDate(result.billDate)
        setShowScanner(false)
        toast.success(`✅ นำเข้า ${newItems.length} รายการจากบิล`)
    }

    function handleStockSheetImport(result: StockSheetResult) {
        const defLoc = locations.find(l => l.code === 'WH_MAIN') || locations[0]
        if (!defLoc) return

        const newItems: PurchaseItem[] = result.items
            .filter(si => si.quantityIn > 0)
            .map(si => {
                const matched = products.find(p =>
                    p.name.toLowerCase().includes(si.name.toLowerCase()) ||
                    si.name.toLowerCase().includes(p.name.toLowerCase())
                )
                return {
                    productId: matched?.id || '',
                    productName: matched?.name || si.name,
                    unit: matched?.unit || si.unit,
                    locationId: defLoc.id,
                    quantity: si.quantityIn,
                    unitCost: si.costPerUnit,
                }
            })

        setItems(prev => [...prev, ...newItems])
        if (result.sheetDate) setPurchaseDate(result.sheetDate)
        setShowStockSheet(false)
        toast.success(`✅ นำเข้า ${newItems.length} รายการจากใบสต็อค`)
    }

    const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0)
    const validItems = items.filter(i => i.productId)
    const defLocationId = (locations.find(l => l.code === 'WH_MAIN') || locations[0])?.id || ''

    async function handleSave() {
        if (validItems.length === 0) return toast.error('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ')
        setSaving(true)
        try {
            const res = await fetch('/api/purchase', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purchaseDate, note,
                    items: validItems.map(i => ({ productId: i.productId, locationId: i.locationId, quantity: i.quantity, unitCost: i.unitCost }))
                })
            })
            const json = await res.json()
            if (json.success) {
                toast.success(`✅ บันทึก ${json.data.poNumber}`)
                setItems([]); setNote(''); fetchOrders()
            } else toast.error(json.error)
        } catch { toast.error('เกิดข้อผิดพลาด') }
        finally { setSaving(false) }
    }

    return (
        <div className="page-container">

            {showScanner && (
                <BillScannerModal
                    onClose={() => setShowScanner(false)}
                    onImport={handleScanImport}
                    defaultLocationId={defLocationId}
                />
            )}

            {showStockSheet && (
                <StockSheetScannerModal
                    onClose={() => setShowStockSheet(false)}
                    onImport={handleStockSheetImport}
                />
            )}

            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">🛒 ซื้อเข้า / รับสินค้า (GR)</h1>
                    <p className="page-subtitle">บันทึกรับสินค้าเข้าคลัง — ระบบคำนวณ WAC อัตโนมัติ</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {tab === 'new' && (
                        <>
                            <button onClick={() => setShowStockSheet(true)} style={{
                                padding: '0.45rem 1.1rem', borderRadius: 10, fontFamily: 'inherit',
                                fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                                border: 'none',
                                background: 'linear-gradient(135deg, #059669, #10B981)',
                                color: '#fff',
                                boxShadow: '0 2px 12px rgba(5,150,105,0.3)',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                📋 AI อ่านใบสต็อค
                            </button>
                            <button onClick={() => setShowScanner(true)} style={{
                                padding: '0.45rem 1.1rem', borderRadius: 10, fontFamily: 'inherit',
                                fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                                border: 'none',
                                background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                                color: '#fff',
                                boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                📷 AI อ่านบิล
                            </button>
                        </>
                    )}
                    {(['new', 'history'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '0.45rem 1.2rem', borderRadius: 10, fontFamily: 'inherit',
                            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                            border: tab === t ? 'none' : '1px solid var(--border)',
                            background: tab === t ? 'var(--accent)' : 'var(--white)',
                            color: tab === t ? '#fff' : 'var(--text-muted)',
                            transition: 'all 0.18s',
                        }}>
                            {t === 'new' ? '➕ สร้างใหม่' : '📋 ประวัติ'}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'new' ? (
                <div className="card">

                    {/* ── Date + Note ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
                        <div>
                            <label className="label">📅 วันที่ซื้อ</label>
                            <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="input" />
                        </div>
                        <div>
                            <label className="label">🏪 ซัพพลายเออร์ / หมายเหตุ</label>
                            <input value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="ชื่อร้าน / ซัพพลายเออร์" />
                        </div>
                    </div>

                    {/* ── Item list header ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                            📦 รายการสินค้า
                            {items.length > 0 && <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 800 }}>{items.length} รายการ</span>}
                        </h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setShowScanner(true)} style={{
                                padding: '0.35rem 0.85rem', borderRadius: 8, fontFamily: 'inherit',
                                fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                                border: 'none', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                                color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                📷 AI อ่านบิล
                            </button>
                            <button onClick={addItem} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}>➕ เพิ่มรายการ</button>
                        </div>
                    </div>

                    {/* ── Empty state ── */}
                    {items.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '2.5rem 1rem',
                            border: '2px dashed var(--border)', borderRadius: 14, color: 'var(--text-muted)',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
                            <p style={{ fontWeight: 600, marginBottom: 4 }}>ยังไม่มีรายการ</p>
                            <p style={{ fontSize: '0.8rem', marginBottom: 16 }}>เพิ่มรายการด้วยมือ หรือ ให้ AI อ่านบิลอัตโนมัติ</p>
                            <button onClick={() => setShowScanner(true)} style={{
                                padding: '0.6rem 1.5rem', borderRadius: 10, fontFamily: 'inherit',
                                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                                border: 'none', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                                color: '#fff', boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                            }}>
                                📷 ถ่ายรูป / อัปโหลดบิล
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* ── Column Headers ── */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '3fr 2fr 0.9fr 1.6fr 1.6fr 1.4fr 32px',
                                gap: 8, padding: '0 0.6rem', marginBottom: 4,
                            }}>
                                {['สินค้า', 'รับเข้าคลัง', 'หน่วย', 'จำนวน', 'ราคา/หน่วย', 'รวม', ''].map((h, idx) => (
                                    <span key={idx} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                                ))}
                            </div>

                            {/* ── Item Rows ── */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {items.map((item, i) => (
                                    <div key={i} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '3fr 2fr 0.9fr 1.6fr 1.6fr 1.4fr 32px',
                                        gap: 8, alignItems: 'center',
                                        background: 'var(--bg)', borderRadius: 10, padding: '0.55rem 0.6rem',
                                        border: item.productId ? '1px solid var(--border)' : '1px solid rgba(232,54,78,0.25)',
                                    }}>
                                        <ProductCombobox products={products} value={item.productId} onChange={p => selectProduct(i, p)} />
                                        <select value={item.locationId} onChange={e => updateItem(i, 'locationId', e.target.value)} className="input" style={{ fontSize: '0.82rem' }}>
                                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', background: 'var(--border-light)', borderRadius: 8, padding: '4px 6px' }}>
                                            {item.unit || '—'}
                                        </div>
                                        <input type="number" value={item.quantity}
                                            onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="input" placeholder="จำนวน" min={0.001} step={0.001}
                                            style={{ fontSize: '0.85rem', textAlign: 'right' }} />
                                        <input type="number" value={item.unitCost}
                                            onChange={e => updateItem(i, 'unitCost', parseFloat(e.target.value) || 0)}
                                            className="input" placeholder="ราคา/หน่วย"
                                            style={{ fontSize: '0.85rem', textAlign: 'right' }} />
                                        <div style={{ textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>
                                            {formatLAK(item.quantity * item.unitCost)}
                                        </div>
                                        <button onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '1rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Footer ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                        <div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>ยอดรวมทั้งหมด</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{formatLAK(total)}</p>
                            {items.length !== validItems.length && (
                                <p style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: 4 }}>⚠️ {items.length - validItems.length} รายการยังไม่ได้เลือกสินค้า</p>
                            )}
                        </div>
                        <button onClick={handleSave} disabled={saving || validItems.length === 0} className="btn-primary"
                            style={{ padding: '0.65rem 2rem', fontSize: '0.95rem' }}>
                            {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกรับสินค้า'}
                        </button>
                    </div>
                </div>

            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                        <thead><tr>
                            <th>เลขที่ PO</th>
                            <th>วันที่</th>
                            <th>รายการ</th>
                            <th style={{ textAlign: 'right' }}>มูลค่า</th>
                            <th>ผู้บันทึก</th>
                            <th>สถานะ</th>
                        </tr></thead>
                        <tbody>
                            {(orders as { poNumber: string; purchaseDate: string; _count: { items: number }; totalAmount: number; createdBy?: { name: string }; status: string }[]).map((o, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700 }}>{o.poNumber}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{new Date(o.purchaseDate).toLocaleDateString('th-TH')}</td>
                                    <td style={{ fontWeight: 600 }}>{o._count.items} รายการ</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>{formatLAK(o.totalAmount)}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{o.createdBy?.name || '-'}</td>
                                    <td>
                                        <span style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                                            {o.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                                    ยังไม่มีประวัติการซื้อ
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
