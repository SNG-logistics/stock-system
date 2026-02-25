'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

interface QueueItem {
    id: string; quantity: number; unitPrice: number; note: string | null
    kitchenStatus: string; stationId: string | null
    statusChangedAt: string | null
    product: { id: string; sku: string; name: string; imageUrl: string | null; category: { code: string; name: string; icon: string; color: string } }
    statusChangedBy: { name: string } | null
}
interface QueueOrder {
    orderId: string; orderNumber: string; tableName: string; zone: string
    openedAt: string; orderNote: string | null
    items: QueueItem[]
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#F59E0B', ACCEPTED: '#3B82F6', COOKING: '#EF4444', READY: '#10B981', SERVED: '#6B7280',
}
const STATUS_LABELS: Record<string, string> = {
    PENDING: '⏳ รอรับ', ACCEPTED: '👌 รับแล้ว', COOKING: '🔥 กำลังทำ', READY: '✅ เสร็จ', SERVED: '🍽️ เสิร์ฟแล้ว',
}
const NEXT_STATUS: Record<string, string> = {
    PENDING: 'ACCEPTED', ACCEPTED: 'COOKING', COOKING: 'READY',
}
const NEXT_LABEL: Record<string, string> = {
    PENDING: '👌 รับงาน', ACCEPTED: '🔥 เริ่มทำ', COOKING: '✅ เสร็จแล้ว',
}

export default function KitchenPage() {
    const [queue, setQueue] = useState<QueueOrder[]>([])
    const [station, setStation] = useState('') // '' = all
    const [statusFilter, setStatusFilter] = useState('PENDING,ACCEPTED,COOKING,READY')
    const [counts, setCounts] = useState({ PENDING: 0, ACCEPTED: 0, COOKING: 0, READY: 0 })
    const [loading, setLoading] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
    const prevCountRef = useRef(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const fetchQueue = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (station) params.set('station', station)
            params.set('status', statusFilter)
            const res = await fetch(`/api/kitchen/queue?${params}`)
            const json = await res.json()
            if (json.success) {
                setQueue(json.data.queue)
                setCounts(json.data.byStatus)

                // Play sound on new PENDING items
                const newPending = json.data.byStatus.PENDING
                if (newPending > prevCountRef.current && prevCountRef.current > 0) {
                    audioRef.current?.play().catch(() => { })
                }
                prevCountRef.current = newPending
            }
        } catch (e) { console.error(e) }
        setLoading(false)
        setLastUpdate(new Date())
    }, [station, statusFilter])

    useEffect(() => { fetchQueue() }, [fetchQueue])

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const interval = setInterval(fetchQueue, 5000)
        return () => clearInterval(interval)
    }, [fetchQueue])

    const updateStatus = async (itemId: string, newStatus: string) => {
        const res = await fetch(`/api/kitchen/items/${itemId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        })
        if (res.ok) fetchQueue()
    }

    const markServed = async (itemId: string) => {
        const res = await fetch(`/api/kitchen/items/${itemId}/served`, { method: 'PATCH' })
        if (res.ok) fetchQueue()
    }

    const timeSince = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
        if (diff < 1) return 'เมื่อกี้'
        if (diff < 60) return `${diff} นาที`
        return `${Math.floor(diff / 60)} ชม. ${diff % 60} น.`
    }

    const stationTabs = [
        { key: '', label: '📋 ทั้งหมด' },
        { key: 'KITCHEN', label: '🍳 ครัว' },
        { key: 'BAR', label: '🍺 บาร์' },
    ]

    const totalItems = counts.PENDING + counts.ACCEPTED + counts.COOKING + counts.READY

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Hidden audio for notification */}
            <audio ref={audioRef} src="data:audio/wav;base64,UklGRl9vT19teleWQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhQu5vT18=" preload="auto" />

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">🍳 Kitchen Display</h1>
                    <p className="page-subtitle">
                        อัปเดตล่าสุด: {lastUpdate.toLocaleTimeString('th-TH')} • {totalItems} รายการ
                    </p>
                </div>

                {/* Status summary pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(counts).map(([status, count]) => (
                        <div key={status} style={{
                            padding: '6px 14px', borderRadius: 20,
                            background: `${STATUS_COLORS[status]}15`,
                            border: `1px solid ${STATUS_COLORS[status]}33`,
                            color: STATUS_COLORS[status],
                            fontWeight: 700, fontSize: '0.85rem',
                        }}>
                            {STATUS_LABELS[status]?.split(' ')[0]} {count}
                        </div>
                    ))}
                </div>
            </div>

            {/* Station tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {stationTabs.map(tab => (
                    <button key={tab.key} onClick={() => setStation(tab.key)} className={`btn ${station === tab.key ? 'btn-primary' : 'btn-secondary'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Queue cards */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>กำลังโหลด...</div>
            ) : queue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                    ✅ ไม่มีออเดอร์ค้าง
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {queue.map(order => {
                        const hasPending = order.items.some(i => i.kitchenStatus === 'PENDING')
                        const allReady = order.items.every(i => i.kitchenStatus === 'READY' || i.kitchenStatus === 'SERVED')
                        const borderColor = hasPending ? 'var(--accent)' : allReady ? '#10B981' : 'var(--border)'

                        return (
                            <div key={order.orderId} className="card" style={{
                                padding: 0,
                                border: `2px solid ${borderColor}`,
                                overflow: 'hidden',
                                boxShadow: hasPending ? '0 0 15px rgba(232, 54, 78, 0.15)' : 'var(--shadow-sm)',
                                animation: hasPending ? 'pulse 2s infinite' : undefined,
                            }}>
                                {/* Order header */}
                                <div style={{
                                    padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', borderBottom: '1px solid var(--border-light)',
                                    background: hasPending ? 'rgba(232, 54, 78, 0.05)' : 'var(--bg)',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>
                                            {order.tableName}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            {order.zone} • #{order.orderNumber}
                                        </div>
                                    </div>
                                    <div style={{
                                        color: hasPending ? 'var(--accent)' : 'var(--text-secondary)',
                                        fontWeight: 700, fontSize: '0.85rem',
                                        background: 'var(--white)',
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        border: '1px solid var(--border)',
                                    }}>
                                        ⏱ {timeSince(order.openedAt)}
                                    </div>
                                </div>

                                {/* Items */}
                                <div style={{ padding: '4px 0' }}>
                                    {order.items.map(item => (
                                        <div key={item.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '12px 16px',
                                            borderBottom: '1px solid var(--border-light)',
                                        }}>
                                            {/* Qty */}
                                            <div style={{
                                                minWidth: 36, height: 36, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                borderRadius: 10, fontWeight: 800, fontSize: '1.1rem',
                                                background: 'var(--accent-bg)', color: 'var(--accent)',
                                            }}>
                                                {item.quantity}
                                            </div>

                                            {/* Name + note */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 700, fontSize: '1rem', color: 'var(--text)',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {item.product.name}
                                                </div>
                                                {item.note && (
                                                    <div style={{ fontSize: '0.8rem', color: '#D97706', fontStyle: 'italic', marginTop: 2 }}>
                                                        📝 {item.note}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status + action */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                {NEXT_STATUS[item.kitchenStatus] ? (
                                                    <button
                                                        onClick={() => updateStatus(item.id, NEXT_STATUS[item.kitchenStatus])}
                                                        className="btn"
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: STATUS_COLORS[NEXT_STATUS[item.kitchenStatus]],
                                                            color: '#FFF',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {NEXT_LABEL[item.kitchenStatus]}
                                                    </button>
                                                ) : item.kitchenStatus === 'READY' ? (
                                                    <button
                                                        onClick={() => markServed(item.id)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                    >
                                                        🍽️ เสิร์ฟ
                                                    </button>
                                                ) : (
                                                    <span className="badge badge-gray">
                                                        {STATUS_LABELS[item.kitchenStatus]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Order note */}
                                {order.orderNote && (
                                    <div style={{ padding: '10px 16px', background: '#FFFBEB', color: '#D97706', fontSize: '0.85rem', fontWeight: 500 }}>
                                        📌 หมายเหตุ: {order.orderNote}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { border-color: var(--accent); opacity: 1; }
                    50% { border-color: var(--accent-light); opacity: 0.9; }
                }
            `}</style>
        </div>
    )
}
