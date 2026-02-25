'use client'
import { useState, useEffect, use } from 'react'
import { useSearchParams } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────
interface OrderItem {
    id: string
    productId: string
    product: { name: string; sku: string }
    quantity: number
    unitPrice: number
    isCancelled: boolean
    note?: string
}

interface Payment {
    id: string
    method: string
    amount: number
    receivedAmount: number
    changeAmount: number
}

interface OrderData {
    id: string
    orderNumber: string
    status: string
    subtotal: number
    discount: number
    discountType: string
    serviceCharge: number
    vat: number
    totalAmount: number
    openedAt: string
    closedAt?: string
    table?: { id: string; name: string; number: number; zone: string }
    items: OrderItem[]
    payments?: Payment[]
    createdBy?: { id: string; name: string }
}

// ─── Format LAK ──────────────────────────────────────────────
function formatLAK(n: number): string {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function paymentMethodLabel(method: string): string {
    switch (method) {
        case 'CASH': return 'เงินสด'
        case 'TRANSFER': return 'เงินโอน'
        case 'CARD': return 'บัตร'
        case 'QRCODE': return 'QR Code'
        default: return method
    }
}

// ═══════════════════════════════════════════════════════════════
// RECEIPT PAGE
// ═══════════════════════════════════════════════════════════════
export default function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params)
    const [order, setOrder] = useState<OrderData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [printed, setPrinted] = useState(false)
    const searchParams = useSearchParams()
    const isPreview = searchParams.get('preview') === '1'

    useEffect(() => {
        async function fetchOrder() {
            try {
                const res = await fetch(`/api/pos/orders/${orderId}`)
                const json = await res.json()
                if (json.success) {
                    setOrder(json.data)
                } else {
                    setError(json.error || 'ไม่พบข้อมูลออเดอร์')
                }
            } catch (e) {
                setError('ไม่สามารถโหลดข้อมูลได้')
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchOrder()
    }, [orderId])

    // Auto-print after data loads (skip when preview mode)
    useEffect(() => {
        if (order && !printed && !isPreview) {
            const timer = setTimeout(() => {
                window.print()
                setPrinted(true)
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [order, printed, isPreview])

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
                <p>⏳ กำลังโหลด...</p>
            </div>
        )
    }

    if (error || !order) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', gap: 12 }}>
                <p style={{ color: '#DC2626', fontSize: 16 }}>❌ {error || 'ไม่พบออเดอร์'}</p>
                <button onClick={() => window.close()} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc', background: '#f5f5f5' }}>ปิดหน้าต่าง</button>
            </div>
        )
    }

    const activeItems = order.items.filter(i => !i.isCancelled)
    const payment = order.payments && order.payments.length > 0 ? order.payments[0] : null
    const discountAmount = order.discountType === 'PERCENT' ? order.subtotal * (order.discount / 100) : order.discount
    const LINE = '================================'
    const DASH = '--------------------------------'

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .receipt-container {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                    }
                }
                @media screen {
                    body {
                        background: #f0f0f0 !important;
                        display: flex;
                        justify-content: center;
                        padding-top: 20px;
                    }
                }
            `}</style>

            {/* Preview Banner */}
            {isPreview && (
                <div className="no-print" style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0,
                    background: '#2563EB',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'sans-serif',
                    zIndex: 200,
                    letterSpacing: 0.5,
                }}>
                    💳 ใบเสร็จสำหรับลูกค้าดู — ยังไม่ได้ชำระเงิน | Please confirm with staff before payment
                </div>
            )}

            {/* Action buttons - screen only */}
            <div className="no-print" style={{
                position: 'fixed',
                top: isPreview ? 48 : 12,
                right: 12,
                display: 'flex',
                gap: 8,
                zIndex: 100,
            }}>
                <button
                    onClick={() => { setPrinted(false); window.print() }}
                    style={{
                        padding: '8px 16px',
                        background: '#2563EB',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                    }}
                >
                    🖨️ พิมพ์อีกครั้ง
                </button>
                <button
                    onClick={() => window.close()}
                    style={{
                        padding: '8px 16px',
                        background: '#fff',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                    }}
                >
                    ✕ ปิด
                </button>
            </div>

            {/* Receipt */}
            <div className="receipt-container" style={{
                width: '302px',
                margin: '0 auto',
                padding: '12px 8px',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '12px',
                lineHeight: 1.4,
                color: '#000',
                background: '#fff',
                boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                border: '1px solid #ddd',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, letterSpacing: 1 }}>{LINE}</div>
                    <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>43 GARDEN</div>
                    <div style={{ fontSize: 12, fontWeight: 'bold' }}>CAFE & RESTAURANT</div>
                    <div style={{ fontSize: 11, letterSpacing: 1, marginTop: 4 }}>{LINE}</div>
                </div>

                {/* Order Info */}
                <div style={{ marginBottom: 4 }}>
                    <div>วันที่: {formatDateTime(order.closedAt || order.openedAt)}</div>
                    {order.table && <div>โต๊ะ: {order.table.name}</div>}
                    <div>บิล: {order.orderNumber}</div>
                    {order.createdBy && <div>แคชเชียร์: {order.createdBy.name}</div>}
                </div>

                {/* Items Header */}
                <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: 1 }}>{LINE}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: 2 }}>
                    <span>รายการ</span>
                    <span>จำนวน</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: 1 }}>{DASH}</div>

                {/* Items */}
                {activeItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginRight: 8,
                            }}>
                                {item.product.name}
                            </span>
                            <span style={{ whiteSpace: 'nowrap' }}>x{item.quantity}</span>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {formatLAK(item.quantity * item.unitPrice)} ₭
                        </div>
                        {item.note && (
                            <div style={{ fontSize: 10, color: '#555', paddingLeft: 8 }}>
                                * {item.note}
                            </div>
                        )}
                    </div>
                ))}

                {/* Totals */}
                <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: 1 }}>{LINE}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>รวม</span>
                    <span>{formatLAK(order.subtotal)} ₭</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>ส่วนลด</span>
                    <span>{formatLAK(discountAmount)} ₭</span>
                </div>
                {order.serviceCharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>ค่าบริการ</span>
                        <span>{formatLAK(order.serviceCharge)} ₭</span>
                    </div>
                )}
                {order.vat > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>VAT</span>
                        <span>{formatLAK(order.vat)} ₭</span>
                    </div>
                )}
                <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: 1 }}>{DASH}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14, marginBottom: 2 }}>
                    <span>ยอดสุทธิ</span>
                    <span>{formatLAK(order.totalAmount)} ₭</span>
                </div>

                {/* Payment */}
                <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: 1 }}>{LINE}</div>
                {payment ? (
                    <div style={{ marginBottom: 4 }}>
                        <div>ชำระ: {paymentMethodLabel(payment.method)}</div>
                        {payment.method === 'CASH' && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>รับมา:</span>
                                    <span>{formatLAK(payment.receivedAmount)} ₭</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>เงินทอน:</span>
                                    <span>{formatLAK(payment.changeAmount)} ₭</span>
                                </div>
                            </>
                        )}
                        {payment.method === 'TRANSFER' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>ยอดโอน:</span>
                                <span>{formatLAK(payment.amount)} ₭</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ marginBottom: 4, color: '#888' }}>ยังไม่ได้ชำระ</div>
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: 1 }}>{LINE}</div>
                <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 12 }}>ขอบคุณที่มาอุดหนุน</div>
                    <div style={{ fontSize: 12 }}>Thank you! ♥</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: 1 }}>{LINE}</div>
            </div>
        </>
    )
}
