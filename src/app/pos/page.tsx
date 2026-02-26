'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────
interface Category { id: string; code: string; name: string; icon: string | null; color: string | null }
interface Product { id: string; sku: string; name: string; salePrice: number; unit: string; categoryId: string; category?: Category; productType: string; imageUrl?: string }
interface DiningTable { id: string; number: number; name: string; zone: string; seats: number; status: string; orders?: Order[] }
interface OrderItemData { id?: string; productId: string; product?: Product; quantity: number; unitPrice: number; note?: string; isCancelled?: boolean }
interface Order { id: string; orderNumber: string; tableId: string; table?: DiningTable; status: string; subtotal: number; discount: number; discountType: string; serviceCharge: number; vat: number; totalAmount: number; note?: string; items: OrderItemData[]; payments?: Payment[] }
interface Payment { id: string; method: string; amount: number; receivedAmount: number; changeAmount: number }

// ─── Format LAK ──────────────────────────────────────────────
function formatLAK(n: number): string {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ₭'
}

// ─── Raw category codes to exclude ──────────────────────────
const RAW_CATEGORY_CODES = ['RAW_MEAT', 'RAW_PORK', 'RAW_SEA', 'RAW_VEG', 'DRY_GOODS', 'PACKAGING', 'OTHER']

// ─── Toast notification ─────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success' | 'warning'; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 5000)
        return () => clearTimeout(t)
    }, [onClose])

    const bg = type === 'error' ? '#FEF2F2' : type === 'success' ? '#ECFDF5' : '#FFFBEB'
    const border = type === 'error' ? '#FECACA' : type === 'success' ? '#A7F3D0' : '#FDE68A'
    const color = type === 'error' ? '#DC2626' : type === 'success' ? '#059669' : '#D97706'
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : '⚠️'

    return (
        <div style={{
            position: 'fixed', top: 16, right: 16, zIndex: 9999,
            background: bg, border: `1px solid ${border}`, borderRadius: 12,
            padding: '12px 20px', color, fontSize: '0.85rem', fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: 8, maxWidth: 400,
            animation: 'slideIn 0.3s ease',
        }}>
            <span>{icon}</span>
            <span style={{ flex: 1 }}>{message}</span>
            <button onClick={onClose} style={{
                background: 'none', border: 'none', color, cursor: 'pointer', fontSize: 16, padding: 0,
            }}>✕</button>
        </div>
    )
}

// ─── Main POS Component ─────────────────────────────────────
export default function POSPage() {
    const [tables, setTables] = useState<DiningTable[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null)
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
    const [orderItems, setOrderItems] = useState<OrderItemData[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [showTableModal, setShowTableModal] = useState(true)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
    const [receivedAmount, setReceivedAmount] = useState<string>('')
    const [discount, setDiscount] = useState(0)
    const [discountType, setDiscountType] = useState<string>('AMOUNT')
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [closeResult, setCloseResult] = useState<{ changeAmount: number; orderId?: string; stockWarnings?: string[] } | null>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [showOrderPanel, setShowOrderPanel] = useState(true)
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null)
    const [showReceiptPreview, setShowReceiptPreview] = useState(false)
    const [proteinPendingProduct, setProteinPendingProduct] = useState<Product | null>(null)
    const [sentItems, setSentItems] = useState<{ kitchen: OrderItemData[], bar: OrderItemData[], orderId: string, tableCode: string } | null>(null)
    const [authChecked, setAuthChecked] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)

    // ─── Auth Check ───────────────────────────────────────────
    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch('/api/pos/tables')
                if (res.status === 401 || res.status === 403) {
                    window.location.href = '/login?redirect=/pos'
                    return
                }
                setAuthChecked(true)
            } catch {
                setToast({ message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', type: 'error' })
                setAuthChecked(true)
            }
        }
        checkAuth()
    }, [])

    useEffect(() => {
        const check = () => {
            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
            setShowOrderPanel(!mobile)
        }
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // ─── Helper: handle API errors ─────────────────────────────
    const handleApiError = useCallback((res: Response, context: string) => {
        if (res.status === 401) {
            window.location.href = '/login?redirect=/pos'
            return true
        }
        if (res.status === 403) {
            setToast({ message: `ไม่มีสิทธิ์: ${context}`, type: 'error' })
            return true
        }
        return false
    }, [])

    // ─── Data Loading ─────────────────────────────────────────
    const fetchTables = useCallback(async () => {
        try {
            const res = await fetch('/api/pos/tables')
            if (handleApiError(res, 'โหลดข้อมูลโต๊ะ')) return
            const json = await res.json()
            if (json.success) setTables(json.data)
        } catch (e) {
            console.error('Fetch tables error:', e)
            setToast({ message: 'ไม่สามารถโหลดข้อมูลโต๊ะได้', type: 'error' })
        }
    }, [handleApiError])

    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch('/api/categories')
            if (handleApiError(res, 'โหลดหมวดหมู่')) return
            const catJson = await res.json()
            if (catJson.success) {
                const saleCategories = (catJson.data as Category[]).filter(c =>
                    !RAW_CATEGORY_CODES.includes(c.code)
                )
                setCategories(saleCategories)
            }

            const pRes = await fetch('/api/products?limit=500')
            if (handleApiError(pRes, 'โหลดสินค้า')) return
            const pJson = await pRes.json()
            if (pJson.success) {
                const allProducts = (pJson.data.products ?? pJson.data) as Product[]
                const saleProducts = allProducts.filter(p => p.productType === 'SALE_ITEM' || p.productType === 'ENTERTAIN')
                setProducts(saleProducts)
            }
        } catch (e) {
            console.error('Fetch products error:', e)
            setToast({ message: 'ไม่สามารถโหลดข้อมูลสินค้าได้', type: 'error' })
        }
    }, [handleApiError])

    useEffect(() => {
        if (!authChecked) return
        fetchTables()
        fetchProducts()
    }, [fetchTables, fetchProducts, authChecked])

    // ─── Table Selection ──────────────────────────────────────
    const selectTable = async (table: DiningTable) => {
        setSelectedTable(table)
        setShowTableModal(false)

        if (table.orders && table.orders.length > 0) {
            const existingOrder = table.orders[0]
            try {
                const res = await fetch(`/api/pos/orders/${existingOrder.id}`)
                if (handleApiError(res, 'โหลดออเดอร์')) return
                const json = await res.json()
                if (json.success) {
                    setCurrentOrder(json.data)
                    setOrderItems(json.data.items.filter((i: OrderItemData) => !i.isCancelled))
                    setDiscount(json.data.discount)
                    setDiscountType(json.data.discountType)
                } else {
                    setToast({ message: json.error || 'ไม่สามารถโหลดออเดอร์ได้', type: 'error' })
                }
            } catch (e) {
                console.error('Load order error:', e)
                setToast({ message: 'เกิดข้อผิดพลาดในการโหลดออเดอร์', type: 'error' })
            }
        } else {
            setCurrentOrder(null)
            setOrderItems([])
            setDiscount(0)
            setDiscountType('AMOUNT')
        }
    }

    // ─── Protein / Topping selection ────────────────────────────
    const PROTEIN_OPTIONS = [
        { label: '🐷 หมู', value: 'หมู', color: '#FCA5A5' },
        { label: '🐔 ไก่', value: 'ไก่', color: '#FCD34D' },
        { label: '🐄 เนื้อวัว', value: 'เนื้อวัว', color: '#D97706' },
        { label: '🦐 ทะเล', value: 'ทะเล', color: '#60A5FA' },
    ]

    // Match categories that require protein selection
    // ← Add more category names/codes here if needed
    const requiresProteinSelection = (product: Product): boolean => {
        const catName = (product.category?.name || '').toLowerCase()
        const catCode = (product.category?.code || '').toLowerCase()
        return catName.includes('ข้าวจานเดียว') ||
            catCode.includes('rice_single') ||
            catCode.includes('single_rice') ||
            catName.includes('จานเดียว')
    }

    // ─── Add Item to Order ────────────────────────────────────
    const addItem = (product: Product) => {
        // Intercept rice-single-dish products for protein selection
        if (requiresProteinSelection(product)) {
            setProteinPendingProduct(product)
            return
        }
        setOrderItems(prev => {
            const existing = prev.find(i => i.productId === product.id && !i.note)
            if (existing) {
                return prev.map(i =>
                    i.productId === product.id && !i.note
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                )
            }
            return [...prev, {
                productId: product.id,
                product,
                quantity: 1,
                unitPrice: product.salePrice,
            }]
        })
    }

    const addItemWithProtein = (product: Product, protein: string) => {
        setOrderItems(prev => [...prev, {
            productId: product.id,
            product,
            quantity: 1,
            unitPrice: product.salePrice,
            note: protein,
        }])
        setProteinPendingProduct(null)
    }

    const updateItemQty = (index: number, delta: number) => {
        setOrderItems(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], quantity: Math.max(0, updated[index].quantity + delta) }
            if (updated[index].quantity === 0) {
                updated.splice(index, 1)
            }
            return updated
        })
    }

    const removeItem = async (index: number) => {
        const item = orderItems[index]
        if (item.id && currentOrder) {
            await fetch(`/api/pos/orders/${currentOrder.id}/items/${item.id}`, { method: 'DELETE' })
        }
        setOrderItems(prev => prev.filter((_, i) => i !== index))
    }

    // ─── Calculate Totals ─────────────────────────────────────
    const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discountAmount = discountType === 'PERCENT' ? subtotal * (discount / 100) : discount
    const afterDiscount = subtotal - discountAmount
    const totalAmount = afterDiscount

    // ─── Save/Create Order ────────────────────────────────────
    const saveOrder = async (): Promise<string | null> => {
        if (!selectedTable || orderItems.length === 0) return null
        setLoading(true)

        try {
            if (currentOrder) {
                const newItems = orderItems.filter(i => !i.id)
                if (newItems.length > 0) {
                    const res = await fetch(`/api/pos/orders/${currentOrder.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            items: newItems.map(i => ({
                                productId: i.productId,
                                quantity: i.quantity,
                                unitPrice: i.unitPrice,
                                note: i.note,
                            })),
                            discount,
                            discountType,
                        }),
                    })
                    if (handleApiError(res, 'บันทึกออเดอร์')) return null
                    const json = await res.json()
                    if (json.success) {
                        setCurrentOrder(json.data)
                        setOrderItems(json.data.items.filter((i: OrderItemData) => !i.isCancelled))
                        setToast({ message: 'บันทึกออเดอร์สำเร็จ', type: 'success' })
                        return json.data.id
                    } else {
                        setToast({ message: json.error || 'บันทึกไม่สำเร็จ', type: 'error' })
                        return null
                    }
                }
                return currentOrder.id
            } else {
                const res = await fetch('/api/pos/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tableId: selectedTable.id,
                        items: orderItems.map(i => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            unitPrice: i.unitPrice,
                            note: i.note,
                        })),
                    }),
                })
                if (handleApiError(res, 'สร้างออเดอร์')) return null
                const json = await res.json()
                if (json.success) {
                    setCurrentOrder(json.data)
                    setOrderItems(json.data.items.filter((i: OrderItemData) => !i.isCancelled))
                    setToast({ message: 'สร้างออเดอร์สำเร็จ', type: 'success' })
                    fetchTables()
                    return json.data.id
                } else {
                    setToast({ message: json.error || 'สร้างออเดอร์ไม่สำเร็จ', type: 'error' })
                    return null
                }
            }
        } catch (e) {
            console.error('Save order error:', e)
            setToast({ message: 'เกิดข้อผิดพลาดในการบันทึก', type: 'error' })
            return null
        } finally {
            setLoading(false)
        }
    }

    const confirmAndSaveOrder = async () => {
        if (!selectedTable || orderItems.length === 0) return;

        const newItems = orderItems.filter(i => !i.id);

        const orderId = await saveOrder();
        if (orderId && newItems.length > 0) {
            const kitchenList: OrderItemData[] = [];
            const barList: OrderItemData[] = [];

            newItems.forEach(item => {
                const code = (item.product?.category?.code || '').toLowerCase();
                const name = (item.product?.category?.name || '').toLowerCase();
                const isDrink = code.includes('drink') || code.includes('bev') || name.includes('เครื่องดื่ม') || name.includes('น้ำ') || name.includes('เบียร์') || name.includes('เหล้า') || name.includes('แอลกอฮอล์');
                if (isDrink) {
                    barList.push(item);
                } else {
                    kitchenList.push(item);
                }
            });

            setSentItems({ kitchen: kitchenList, bar: barList, orderId, tableCode: selectedTable.name });
        }
    }

    // ─── Close Bill ───────────────────────────────────────────
    const closeBill = async () => {
        if (orderItems.length === 0) {
            setToast({ message: 'ยังไม่มีรายการสินค้า', type: 'warning' })
            return
        }

        // Save first if not saved yet
        let orderId = currentOrder?.id || null
        if (!orderId) {
            orderId = await saveOrder()
            if (!orderId) {
                setToast({ message: 'ไม่สามารถสร้างออเดอร์ได้', type: 'error' })
                return
            }
        } else {
            // Update existing order with any new items
            const newItems = orderItems.filter(i => !i.id)
            if (newItems.length > 0) {
                try {
                    const res = await fetch(`/api/pos/orders/${orderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            items: newItems.map(i => ({
                                productId: i.productId,
                                quantity: i.quantity,
                                unitPrice: i.unitPrice,
                                note: i.note,
                            })),
                            discount,
                            discountType,
                        }),
                    })
                    if (handleApiError(res, 'อัพเดตออเดอร์')) return
                    const json = await res.json()
                    if (json.success) {
                        setCurrentOrder(json.data)
                        setOrderItems(json.data.items.filter((i: OrderItemData) => !i.isCancelled))
                    }
                } catch (e) {
                    console.error('Update order before close error:', e)
                    setToast({ message: 'ไม่สามารถอัพเดตออเดอร์ก่อนปิดบิล', type: 'error' })
                    return
                }
            }
        }

        setShowReceiptPreview(true)
    }

    const confirmPayment = async () => {
        const orderId = currentOrder?.id
        if (!orderId) {
            setToast({ message: 'ไม่พบออเดอร์', type: 'error' })
            return
        }
        setPaymentLoading(true)

        try {
            const received = paymentMethod === 'CASH' ? parseFloat(receivedAmount || '0') : totalAmount
            const res = await fetch(`/api/pos/orders/${orderId}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod,
                    receivedAmount: received,
                    discount,
                    discountType,
                }),
            })
            if (handleApiError(res, 'ปิดบิล')) {
                setPaymentLoading(false)
                return
            }
            const json = await res.json()
            if (json.success) {
                setCloseResult({
                    changeAmount: json.data.changeAmount,
                    orderId: orderId,
                    stockWarnings: json.data.stockWarnings,
                })
            } else {
                setToast({ message: json.error || 'ปิดบิลไม่สำเร็จ', type: 'error' })
            }
        } catch (e) {
            console.error('Close bill error:', e)
            setToast({ message: 'เกิดข้อผิดพลาดในการปิดบิล', type: 'error' })
        } finally {
            setPaymentLoading(false)
        }
    }

    const resetAfterClose = () => {
        setCloseResult(null)
        setShowPaymentModal(false)
        setShowReceiptPreview(false)
        setCurrentOrder(null)
        setOrderItems([])
        setSelectedTable(null)
        setDiscount(0)
        setDiscountType('AMOUNT')
        setPaymentMethod('CASH')
        setReceivedAmount('')
        setShowTableModal(true)
        fetchTables()
    }

    const cancelOrder = () => {
        if (!confirm('ยกเลิกออเดอร์ทั้งหมด?')) return
        setCurrentOrder(null)
        setOrderItems([])
        setDiscount(0)
    }

    // ─── Filtered products ────────────────────────────────────
    const filteredProducts = products.filter(p => {
        if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        }
        return true
    })

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    // ─── Auth Loading ─────────────────────────────────────────
    if (!authChecked) {
        return (
            <div style={{ minHeight: '100%', background: '#F8F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#6B7280' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                    <div style={{ fontSize: '0.9rem' }}>กำลังตรวจสอบสิทธิ์...</div>
                </div>
            </div>
        )
    }

    // ─── Table Selection Screen ───────────────────────────────
    if (showTableModal) {
        const tablesByZone: Record<string, DiningTable[]> = {}
        tables.forEach(t => {
            if (!tablesByZone[t.zone]) tablesByZone[t.zone] = []
            tablesByZone[t.zone].push(t)
        })

        return (
            <div style={{ minHeight: '100%', background: '#F8F9FC', overflowY: 'auto', padding: isMobile ? '1rem' : '2rem' }}>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '1.25rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid #E5E7EB',
                }}>
                    <div>
                        <h1 className="page-title">🍽️ เลือกโต๊ะ</h1>
                        <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginTop: 4 }}>เลือกโต๊ะเพื่อเริ่มออเดอร์</p>
                    </div>
                    <a href="/dashboard" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0.5rem 1rem',
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: 10,
                        color: '#1A1D26',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        transition: 'all 0.15s ease',
                        minHeight: 44,
                    }}>
                        ← กลับหน้าหลัก
                    </a>
                </div>

                {/* Tables by zone */}
                {Object.entries(tablesByZone).map(([zone, zoneTables]) => (
                    <div key={zone} style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{
                            color: '#6B7280',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            marginBottom: '0.75rem',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}>
                            📍 {zone}
                        </h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '0.75rem',
                        }}>
                            {zoneTables.map(table => {
                                const hasOrder = table.orders && table.orders.length > 0
                                const isAvailable = table.status === 'AVAILABLE'
                                const borderColor = hasOrder ? '#E8364E' : isAvailable ? '#22C55E' : '#D97706'
                                const statusText = hasOrder ? '🔴 มีออเดอร์' : isAvailable ? '🟢 ว่าง' : '🟡 จอง'
                                const statusBg = hasOrder ? '#FEF2F2' : isAvailable ? '#ECFDF5' : '#FFFBEB'

                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => selectTable(table)}
                                        style={{
                                            background: '#FFFFFF',
                                            border: `2px solid ${borderColor}`,
                                            borderRadius: 14,
                                            padding: isMobile ? '0.75rem 0.5rem' : '1rem',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'all 0.15s ease',
                                            color: '#1A1D26',
                                            fontFamily: 'inherit',
                                            minHeight: 48,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                                                ; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${borderColor}25`
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.transform = 'none'
                                                ; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                                        }}
                                    >
                                        <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', marginBottom: 4 }}>🪑</div>
                                        <div style={{ fontWeight: 700, fontSize: isMobile ? '0.85rem' : '1rem', color: '#1A1D26' }}>{table.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>{table.seats} ที่นั่ง</div>
                                        <div style={{
                                            fontSize: '0.6rem',
                                            marginTop: 6,
                                            color: borderColor,
                                            fontWeight: 600,
                                            background: statusBg,
                                            borderRadius: 9999,
                                            padding: '2px 8px',
                                            display: 'inline-block',
                                        }}>{statusText}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // ─── Main POS UI ──────────────────────────────────────────
    const rightPanelWidth = 320
    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            overflow: 'hidden', background: '#F8F9FC',
        }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ════ PROTEIN SELECTOR MODAL ════ */}
            {proteinPendingProduct && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 600,
                    background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                    backdropFilter: 'blur(4px)',
                }}
                    onClick={() => setProteinPendingProduct(null)}
                >
                    <div style={{
                        background: '#fff', borderRadius: 20,
                        padding: '1.5rem 1.5rem 1.25rem',
                        width: '100%', maxWidth: 380,
                        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                        animation: 'slideIn 0.2s ease',
                    }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Title */}
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>🍽️</div>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1A1D26' }}>
                                {proteinPendingProduct.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 4 }}>
                                เลือกประเภทเนื้อสัตว์
                            </div>
                        </div>

                        {/* Protein Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                            {PROTEIN_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => addItemWithProtein(proteinPendingProduct, opt.value)}
                                    style={{
                                        padding: '1rem 0.5rem',
                                        borderRadius: 14,
                                        border: `2px solid ${opt.color}`,
                                        background: opt.color + '18',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.background = opt.color + '35'
                                            ; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.background = opt.color + '18'
                                            ; (e.currentTarget as HTMLElement).style.transform = 'none'
                                    }}
                                >
                                    <span style={{ fontSize: '1.8rem' }}>{opt.label.split(' ')[0]}</span>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1D26' }}>
                                        {opt.label.split(' ')[1]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Cancel */}
                        <button
                            onClick={() => setProteinPendingProduct(null)}
                            style={{
                                width: '100%', padding: '0.55rem', borderRadius: 10,
                                border: '1px solid #E5E7EB', background: '#F9FAFB',
                                cursor: 'pointer', fontFamily: 'inherit',
                                color: '#6B7280', fontSize: '0.85rem', fontWeight: 600,
                            }}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}

            {/* ════ LEFT PANEL — Menu ════ */}
            <div style={{
                position: isMobile ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                right: isMobile ? 0 : rightPanelWidth,
                bottom: isMobile ? undefined : 0,
                height: isMobile ? (showOrderPanel ? '50%' : '100%') : undefined,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                borderRight: isMobile ? 'none' : '1px solid #E5E7EB',
                borderBottom: isMobile ? '1px solid #E5E7EB' : 'none',
                transition: 'height 0.2s ease',
            }}>
                {/* Top Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0.6rem 0.75rem',
                    borderBottom: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}>
                    <div style={{
                        width: 32, height: 32,
                        background: 'linear-gradient(135deg, #E8364E, #FF6B81)',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, flexShrink: 0,
                    }}>🍽️</div>
                    {!isMobile && <span style={{ fontWeight: 700, color: '#1A1D26', fontSize: '0.95rem' }}>43 Garden POS</span>}
                    <div style={{ flex: 1 }} />

                    {/* Search */}
                    <div style={{ position: 'relative', width: isMobile ? 140 : 240 }}>
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="🔍 ค้นหา..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.45rem 0.75rem',
                                background: '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                borderRadius: 10,
                                color: '#1A1D26',
                                fontSize: '0.82rem',
                                fontFamily: 'inherit',
                                outline: 'none',
                                minHeight: 38,
                                transition: 'all 0.15s ease',
                            }}
                            onFocus={e => {
                                e.currentTarget.style.borderColor = '#E8364E'
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,54,78,0.08)'
                            }}
                            onBlur={e => {
                                e.currentTarget.style.borderColor = '#E5E7EB'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                        />
                    </div>

                    {/* Mobile: toggle order panel */}
                    {isMobile && (
                        <button
                            onClick={() => setShowOrderPanel(!showOrderPanel)}
                            style={{
                                background: showOrderPanel ? '#E8364E' : '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                borderRadius: 8,
                                padding: '0.45rem 0.6rem',
                                color: showOrderPanel ? '#FFFFFF' : '#1A1D26',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontFamily: 'inherit',
                                minHeight: 38, minWidth: 38,
                                position: 'relative',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            🛒
                            {orderItems.length > 0 && (
                                <span style={{
                                    position: 'absolute', top: -6, right: -6,
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: '#22C55E', color: '#fff',
                                    fontSize: '0.6rem', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid #FFFFFF',
                                }}>{orderItems.length}</span>
                            )}
                        </button>
                    )}

                    <button
                        onClick={() => { setShowTableModal(true) }}
                        style={{
                            background: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: 8,
                            padding: '0.45rem 0.65rem',
                            color: '#1A1D26',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontFamily: 'inherit',
                            minHeight: 38, whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        🪑 {isMobile ? '' : 'เปลี่ยนโต๊ะ'}
                    </button>
                </div>

                {/* Category Tabs */}
                <div style={{
                    display: 'flex', gap: 6, padding: '0.5rem 0.75rem',
                    overflowX: 'auto', borderBottom: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    scrollbarWidth: 'none',
                    flexShrink: 0,
                }}>
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: 9999,
                            border: selectedCategory === 'ALL' ? 'none' : '1px solid #E5E7EB',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: selectedCategory === 'ALL' ? 600 : 400,
                            background: selectedCategory === 'ALL' ? '#E8364E' : '#FFFFFF',
                            color: selectedCategory === 'ALL' ? '#fff' : '#6B7280',
                            whiteSpace: 'nowrap',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s ease',
                            minHeight: 34,
                        }}
                    >
                        ทั้งหมด
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: 9999,
                                border: selectedCategory === cat.id ? 'none' : '1px solid #E5E7EB',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: selectedCategory === cat.id ? 600 : 400,
                                background: selectedCategory === cat.id ? (cat.color || '#E8364E') : '#FFFFFF',
                                color: selectedCategory === cat.id ? '#fff' : '#6B7280',
                                whiteSpace: 'nowrap',
                                fontFamily: 'inherit',
                                transition: 'all 0.15s ease',
                                minHeight: 34,
                            }}
                        >
                            {cat.icon} {cat.name}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '0.75rem',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '0.6rem',
                    alignContent: 'start',
                }}>
                    {filteredProducts.map(product => {
                        const catColor = categories.find(c => c.id === product.categoryId)?.color || '#6B7280'
                        const catIcon = categories.find(c => c.id === product.categoryId)?.icon || '📦'
                        return (
                            <button
                                key={product.id}
                                onClick={() => addItem(product)}
                                style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: 14,
                                    padding: '0.6rem',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.15s ease',
                                    color: '#1A1D26',
                                    fontFamily: 'inherit',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    minHeight: isMobile ? 100 : 120,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = catColor
                                        ; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                                        ; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'
                                        ; (e.currentTarget as HTMLElement).style.transform = 'none'
                                        ; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                            >
                                {/* Product image or icon */}
                                {product.imageUrl ? (
                                    <div style={{
                                        width: isMobile ? 48 : 60, height: isMobile ? 48 : 60,
                                        borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                                    }}>
                                        <img src={product.imageUrl} alt={product.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div style={{
                                        width: isMobile ? 48 : 60, height: isMobile ? 48 : 60,
                                        borderRadius: 10,
                                        background: catColor + '15',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: isMobile ? '1.4rem' : '1.8rem', flexShrink: 0,
                                    }}>
                                        {catIcon}
                                    </div>
                                )}
                                <span style={{
                                    fontSize: isMobile ? '0.72rem' : '0.78rem',
                                    fontWeight: 600,
                                    lineHeight: 1.25,
                                    maxHeight: '2.5em',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word' as const,
                                    color: '#1A1D26',
                                }}>{product.name}</span>
                                <span style={{
                                    fontSize: isMobile ? '0.68rem' : '0.72rem',
                                    color: '#E8364E',
                                    fontWeight: 700,
                                    marginTop: 'auto',
                                }}>
                                    {formatLAK(product.salePrice)}
                                </span>
                            </button>
                        )
                    })}
                    {filteredProducts.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                            <div style={{ fontSize: '0.85rem' }}>ไม่พบเมนู</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ════ RIGHT PANEL — Order ════ */}
            {(!isMobile || showOrderPanel) && (
                <div style={{
                    position: isMobile ? 'relative' : 'absolute',
                    top: isMobile ? undefined : 0,
                    right: 0,
                    bottom: isMobile ? undefined : 0,
                    width: isMobile ? '100%' : rightPanelWidth,
                    height: isMobile ? '50%' : undefined,
                    display: 'flex', flexDirection: 'column',
                    background: '#FFFFFF',
                    borderLeft: isMobile ? 'none' : '1px solid #E5E7EB',
                    boxShadow: isMobile ? 'none' : '-1px 0 4px rgba(0,0,0,0.03)',
                }}>
                    {/* Table header */}
                    <div style={{
                        padding: '0.7rem 0.85rem',
                        borderBottom: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexShrink: 0,
                        background: '#FFFFFF',
                    }}>
                        <div style={{
                            padding: '4px 10px',
                            background: '#FFF0F2',
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, color: '#E8364E', fontWeight: 600,
                        }}>🪑</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1D26' }}>
                                {selectedTable?.name || 'ไม่ได้เลือกโต๊ะ'}
                            </div>
                            {currentOrder && (
                                <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>#{currentOrder.orderNumber}</div>
                            )}
                        </div>
                        <span style={{
                            fontSize: '0.7rem',
                            color: '#6B7280',
                            background: '#F3F4F6',
                            padding: '3px 8px',
                            borderRadius: 9999,
                            fontWeight: 500,
                        }}>
                            {orderItems.length} รายการ
                        </span>
                        <button onClick={() => alert('AI Bill Reading Feature - Implementation Pending')} style={{
                            padding: '4px 10px',
                            background: '#FFF0F2',
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, color: '#E8364E', fontWeight: 600,
                        }}>AI อ่านบิล</button>
                        {/* TODO: Antigravity integrate AI OCR API here, and format the AI response */}
                    </div>

                    {/* Order Items List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                        {orderItems.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9CA3AF' }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🛒</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>ยังไม่มีรายการ</div>
                                <div style={{ fontSize: '0.72rem', marginTop: 4 }}>แตะเมนูเพื่อเพิ่ม</div>
                            </div>
                        ) : (
                            orderItems.map((item, idx) => (
                                <div key={idx} style={{
                                    background: '#FFFFFF',
                                    borderRadius: 10,
                                    padding: '0.55rem 0.7rem',
                                    marginBottom: '0.35rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    border: '1px solid #F3F4F6',
                                    transition: 'all 0.15s ease',
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: '#1A1D26',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {item.product?.name || item.productId}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                            {formatLAK(item.unitPrice)} × {item.quantity}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <button onClick={() => updateItemQty(idx, -1)}
                                            style={{
                                                width: 30, height: 30, borderRadius: 8,
                                                border: '1px solid #E5E7EB', background: '#FFFFFF',
                                                color: '#1A1D26', cursor: 'pointer', fontSize: '0.9rem',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontFamily: 'inherit',
                                                transition: 'all 0.15s ease',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.borderColor = '#E8364E'
                                                    ; (e.currentTarget as HTMLElement).style.color = '#E8364E'
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'
                                                    ; (e.currentTarget as HTMLElement).style.color = '#1A1D26'
                                            }}
                                        >−</button>
                                        <span style={{
                                            minWidth: 24, textAlign: 'center',
                                            fontSize: '0.82rem', fontWeight: 700, color: '#1A1D26',
                                        }}>
                                            {item.quantity}
                                        </span>
                                        <button onClick={() => updateItemQty(idx, 1)}
                                            style={{
                                                width: 30, height: 30, borderRadius: 8,
                                                border: '1px solid #E5E7EB', background: '#FFFFFF',
                                                color: '#1A1D26', cursor: 'pointer', fontSize: '0.9rem',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontFamily: 'inherit',
                                                transition: 'all 0.15s ease',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.borderColor = '#E8364E'
                                                    ; (e.currentTarget as HTMLElement).style.color = '#E8364E'
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'
                                                    ; (e.currentTarget as HTMLElement).style.color = '#1A1D26'
                                            }}
                                        >+</button>
                                    </div>

                                    <div style={{
                                        minWidth: 72, textAlign: 'right',
                                        fontSize: '0.8rem', fontWeight: 700, color: '#E8364E',
                                    }}>
                                        {formatLAK(item.quantity * item.unitPrice)}
                                    </div>

                                    <button onClick={() => removeItem(idx)}
                                        style={{
                                            width: 26, height: 26, borderRadius: 6,
                                            border: 'none', background: 'transparent',
                                            color: '#9CA3AF', cursor: 'pointer', fontSize: '0.72rem',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'color 0.15s ease',
                                        }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9CA3AF' }}
                                    >✕</button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Discount Row */}
                    {orderItems.length > 0 && (
                        <div style={{
                            padding: '0.5rem 0.75rem',
                            borderTop: '1px solid #E5E7EB',
                            flexShrink: 0,
                            background: '#FAFBFD',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>ส่วนลด:</span>
                                <input
                                    type="number"
                                    value={discount || ''}
                                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                    style={{
                                        width: 75, padding: '0.35rem 0.5rem',
                                        background: '#FFFFFF', border: '1px solid #E5E7EB',
                                        borderRadius: 8, color: '#1A1D26', fontSize: '0.8rem',
                                        fontFamily: 'inherit', outline: 'none', textAlign: 'right', minHeight: 32,
                                        transition: 'border-color 0.15s ease',
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#E8364E' }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
                                />
                                <select
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value)}
                                    style={{
                                        padding: '0.35rem 0.4rem', background: '#FFFFFF',
                                        border: '1px solid #E5E7EB', borderRadius: 8, color: '#1A1D26',
                                        fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', minHeight: 32,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="AMOUNT">₭</option>
                                    <option value="PERCENT">%</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Totals */}
                    <div style={{
                        padding: '0.7rem 0.75rem',
                        borderTop: '1px solid #E5E7EB',
                        background: '#F8F9FC',
                        flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>รวม</span>
                            <span style={{ fontSize: '0.8rem', color: '#1A1D26', fontWeight: 500 }}>{formatLAK(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>ส่วนลด</span>
                                <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 500 }}>-{formatLAK(discountAmount)}</span>
                            </div>
                        )}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            paddingTop: 8, borderTop: '1px solid #E5E7EB', marginTop: 4,
                        }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1A1D26' }}>ยอดรวมสุทธิ</span>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#E8364E' }}>{formatLAK(totalAmount)}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ padding: '0.65rem', display: 'flex', gap: 8, flexShrink: 0, background: '#FFFFFF' }}>
                        <button onClick={cancelOrder} disabled={orderItems.length === 0}
                            style={{
                                flex: 1, padding: '0.65rem', borderRadius: 10,
                                border: '1px solid #E5E7EB', background: '#FFFFFF',
                                color: '#6B7280', cursor: 'pointer', fontSize: '0.82rem',
                                fontWeight: 600, fontFamily: 'inherit',
                                opacity: orderItems.length === 0 ? 0.5 : 1, minHeight: 44,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            ❌ ยกเลิก
                        </button>
                        <button onClick={confirmAndSaveOrder} disabled={orderItems.length === 0 || loading}
                            style={{
                                flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none',
                                background: '#2563EB', color: '#fff', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit',
                                opacity: orderItems.length === 0 ? 0.5 : 1, minHeight: 44,
                                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            ✅ ยืนยัน
                        </button>
                        <button onClick={closeBill} disabled={orderItems.length === 0}
                            style={{
                                flex: 1.5, padding: '0.65rem', borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #E8364E, #FF6B81)',
                                color: '#fff', cursor: 'pointer',
                                fontSize: '0.88rem', fontWeight: 700, fontFamily: 'inherit',
                                boxShadow: '0 4px 16px rgba(232,54,78,0.3)',
                                opacity: orderItems.length === 0 ? 0.5 : 1, minHeight: 44,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            💰 ปิดบิล
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile: Floating Cart Button */}
            {isMobile && !showOrderPanel && orderItems.length > 0 && (
                <button
                    onClick={() => setShowOrderPanel(true)}
                    style={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #E8364E, #FF6B81)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '1.4rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(232,54,78,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 50,
                    }}
                >
                    🛒
                    <span style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#22C55E', color: '#fff',
                        fontSize: '0.65rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #FFFFFF',
                    }}>{orderItems.length}</span>
                </button>
            )}

            {/* ════ RECEIPT PREVIEW MODAL ════ */}
            {showReceiptPreview && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100,
                    backdropFilter: 'blur(8px)',
                    padding: '0.75rem',
                }}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 400,
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexShrink: 0,
                        }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1A1D26' }}>🧾 ใบเสร็จ — {selectedTable?.name}</div>
                                {currentOrder && <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>#{currentOrder.orderNumber}</div>}
                            </div>
                            <button onClick={() => setShowReceiptPreview(false)}
                                style={{
                                    background: '#F3F4F6', border: 'none', color: '#6B7280',
                                    cursor: 'pointer', borderRadius: 8,
                                    minWidth: 36, minHeight: 36,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                                }}
                            >✕</button>
                        </div>

                        {/* Items */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
                            {/* Store name */}
                            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1A1D26' }}>43 Garden Restaurant</div>
                                <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                    {new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                            </div>
                            <div style={{ borderTop: '1px dashed #D1D5DB', borderBottom: '1px dashed #D1D5DB', padding: '0.75rem 0', marginBottom: '0.75rem' }}>
                                {orderItems.map((item, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'baseline',
                                        gap: 8, marginBottom: 6, fontSize: '0.82rem',
                                    }}>
                                        <span style={{ flex: 1, color: '#1A1D26', fontWeight: 500 }}>
                                            {item.product?.name || item.productId}
                                        </span>
                                        <span style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>
                                            {item.quantity} × {formatLAK(item.unitPrice)}
                                        </span>
                                        <span style={{ color: '#1A1D26', fontWeight: 700, minWidth: 72, textAlign: 'right' }}>
                                            {formatLAK(item.quantity * item.unitPrice)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div style={{ fontSize: '0.82rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: '#6B7280' }}>รวม</span>
                                    <span style={{ color: '#1A1D26', fontWeight: 500 }}>{formatLAK(subtotal)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ color: '#6B7280' }}>ส่วนลด</span>
                                        <span style={{ color: '#059669', fontWeight: 500 }}>-{formatLAK(discountAmount)}</span>
                                    </div>
                                )}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    paddingTop: 8, borderTop: '2px solid #1A1D26', marginTop: 4,
                                }}>
                                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1A1D26' }}>ยอดรวมสุทธิ</span>
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#E8364E' }}>{formatLAK(totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                            padding: '0.9rem 1.25rem',
                            borderTop: '1px solid #E5E7EB',
                            display: 'flex', gap: 8, flexShrink: 0,
                            background: '#FAFBFD',
                        }}>
                            <button
                                onClick={() => {
                                    if (currentOrder?.id) {
                                        window.open(`/receipt/${currentOrder.id}?preview=1`, '_blank', 'width=380,height=700')
                                    }
                                }}
                                style={{
                                    flex: 1, padding: '0.7rem', borderRadius: 10,
                                    border: '2px solid #2563EB', background: '#EFF6FF',
                                    color: '#2563EB', cursor: 'pointer', fontSize: '0.85rem',
                                    fontWeight: 700, fontFamily: 'inherit', minHeight: 46,
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                🖨️ พิมพ์ให้ลูกค้าดู
                            </button>
                            <button
                                onClick={() => { setShowReceiptPreview(false); setShowPaymentModal(true) }}
                                style={{
                                    flex: 1.5, padding: '0.7rem', borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg, #059669, #10B981)',
                                    color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
                                    fontWeight: 700, fontFamily: 'inherit',
                                    boxShadow: '0 4px 16px rgba(5,150,105,0.3)', minHeight: 46,
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                💳 ไปชำระเงิน →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ SEND TO KITCHEN / BAR MODAL ════ */}
            {sentItems && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100,
                    backdropFilter: 'blur(8px)',
                    padding: '0.75rem',
                }}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 400,
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem',
                            borderBottom: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexShrink: 0,
                        }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1A1D26' }}>✅ ส่งออเดอร์สำเร็จ</div>
                                <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: 4 }}>โต๊ะ: {sentItems.tableCode}</div>
                            </div>
                            <button onClick={() => setSentItems(null)}
                                style={{
                                    background: '#F3F4F6', border: 'none', color: '#6B7280',
                                    cursor: 'pointer', borderRadius: 8,
                                    minWidth: 36, minHeight: 36,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                                }}
                            >✕</button>
                        </div>

                        {/* lists */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontWeight: 700, color: '#1A1D26', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <span style={{ fontSize: '1.2rem' }}>👩‍🍳</span> ส่งครัว ({sentItems.kitchen.length} รายการ)
                                </div>
                                {sentItems.kitchen.length > 0 ? (
                                    <div style={{ background: '#F8F9FC', borderRadius: 8, padding: '0.75rem', border: '1px solid #E5E7EB' }}>
                                        {sentItems.kitchen.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                                                <span>{item.quantity} × {item.product?.name}</span>
                                                {item.note && <span style={{ color: '#E8364E', fontSize: '0.8rem', marginLeft: 4 }}>({item.note})</span>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#9CA3AF', padding: '0.5rem', textAlign: 'center' }}>ไม่มีรายการส่งครัว</div>
                                )}
                            </div>

                            <div>
                                <div style={{ fontWeight: 700, color: '#1A1D26', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <span style={{ fontSize: '1.2rem' }}>🍹</span> ส่งบาร์ ({sentItems.bar.length} รายการ)
                                </div>
                                {sentItems.bar.length > 0 ? (
                                    <div style={{ background: '#F8F9FC', borderRadius: 8, padding: '0.75rem', border: '1px solid #E5E7EB' }}>
                                        {sentItems.bar.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                                                <span>{item.quantity} × {item.product?.name}</span>
                                                {item.note && <span style={{ color: '#E8364E', fontSize: '0.8rem', marginLeft: 4 }}>({item.note})</span>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#9CA3AF', padding: '0.5rem', textAlign: 'center' }}>ไม่มีรายการส่งบาร์</div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #E5E7EB', background: '#FAFBFD' }}>
                            <button onClick={() => setSentItems(null)}
                                style={{
                                    width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg, #059669, #10B981)',
                                    color: '#fff', cursor: 'pointer', fontSize: '0.95rem',
                                    fontWeight: 700, fontFamily: 'inherit',
                                    boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ PAYMENT MODAL ════ */}
            {showPaymentModal && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100,
                    backdropFilter: 'blur(8px)',
                    padding: '0.75rem',
                }}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        padding: isMobile ? '1.5rem' : '2rem',
                        width: '100%',
                        maxWidth: 440,
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
                        maxHeight: '92vh',
                        overflowY: 'auto',
                    }}>
                        {closeResult ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669', marginBottom: 8 }}>ปิดบิลสำเร็จ!</h2>
                                {closeResult.changeAmount > 0 && (
                                    <div style={{
                                        background: '#ECFDF5',
                                        borderRadius: 12,
                                        padding: '1rem',
                                        marginBottom: 12,
                                        border: '1px solid #A7F3D0',
                                    }}>
                                        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>เงินทอน</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>{formatLAK(closeResult.changeAmount)}</div>
                                    </div>
                                )}
                                {closeResult.stockWarnings && closeResult.stockWarnings.length > 0 && (
                                    <div style={{
                                        background: '#FFFBEB',
                                        borderRadius: 10,
                                        padding: '0.75rem',
                                        marginBottom: 12,
                                        textAlign: 'left',
                                        border: '1px solid #FDE68A',
                                    }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#D97706', marginBottom: 4 }}>⚠️ คำเตือนสต็อค:</div>
                                        {closeResult.stockWarnings.map((w, i) => (
                                            <div key={i} style={{ fontSize: '0.75rem', color: '#92400E', marginBottom: 2 }}>{w}</div>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <button
                                        onClick={() => {
                                            if (closeResult.orderId) {
                                                window.open(`/receipt/${closeResult.orderId}`, '_blank', 'width=350,height=700')
                                            }
                                        }}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: 10,
                                            border: '2px solid #2563EB', background: '#EFF6FF',
                                            color: '#2563EB', cursor: 'pointer', fontSize: '0.95rem',
                                            fontWeight: 700, fontFamily: 'inherit', minHeight: 48,
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        🖨️ พิมพ์บิล
                                    </button>
                                    <button onClick={resetAfterClose}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: 10, border: 'none',
                                            background: 'linear-gradient(135deg, #E8364E, #FF6B81)',
                                            color: '#fff', cursor: 'pointer', fontSize: '0.95rem',
                                            fontWeight: 700, fontFamily: 'inherit',
                                            boxShadow: '0 4px 16px rgba(232,54,78,0.3)', minHeight: 48,
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        ✨ ออเดอร์ใหม่
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1A1D26' }}>💳 ชำระเงิน</h2>
                                    <button onClick={() => setShowPaymentModal(false)}
                                        style={{
                                            background: '#F3F4F6', border: 'none', color: '#6B7280',
                                            cursor: 'pointer', fontSize: '1rem',
                                            minWidth: 36, minHeight: 36,
                                            borderRadius: 8,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E5E7EB' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6' }}
                                    >✕</button>
                                </div>

                                <div style={{
                                    background: '#F8F9FC',
                                    borderRadius: 12,
                                    padding: '1rem',
                                    marginBottom: '1.25rem',
                                    textAlign: 'center',
                                    border: '1px solid #E5E7EB',
                                }}>
                                    <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>ยอดที่ต้องชำระ</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#E8364E' }}>{formatLAK(totalAmount)}</div>
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 8, fontWeight: 500 }}>วิธีชำระ</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                        {([
                                            { key: 'CASH', icon: '💵', label: 'เงินสด' },
                                            { key: 'TRANSFER', icon: '📱', label: 'เงินโอน' },
                                        ] as const).map(m => (
                                            <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                                                style={{
                                                    padding: '0.75rem 0.5rem', borderRadius: 10,
                                                    border: `2px solid ${paymentMethod === m.key ? '#E8364E' : '#E5E7EB'}`,
                                                    background: paymentMethod === m.key ? '#FFF0F2' : '#FFFFFF',
                                                    color: '#1A1D26', cursor: 'pointer',
                                                    textAlign: 'center', fontFamily: 'inherit', minHeight: 56,
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                <div style={{ fontSize: '1.3rem' }}>{m.icon}</div>
                                                <div style={{ fontSize: '0.78rem', marginTop: 3, color: paymentMethod === m.key ? '#E8364E' : '#6B7280', fontWeight: paymentMethod === m.key ? 600 : 400 }}>{m.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {paymentMethod === 'CASH' && (
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>จำนวนเงินที่รับ</div>
                                        <input
                                            type="number"
                                            value={receivedAmount}
                                            onChange={e => setReceivedAmount(e.target.value)}
                                            placeholder={String(totalAmount)}
                                            style={{
                                                width: '100%', padding: '0.7rem',
                                                background: '#FFFFFF', border: '1px solid #E5E7EB',
                                                borderRadius: 10, color: '#1A1D26',
                                                fontSize: '1.1rem', fontWeight: 700,
                                                fontFamily: 'inherit', outline: 'none', textAlign: 'right', minHeight: 48,
                                                transition: 'all 0.15s ease',
                                                boxSizing: 'border-box',
                                            }}
                                            onFocus={e => {
                                                e.currentTarget.style.borderColor = '#E8364E'
                                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,54,78,0.08)'
                                            }}
                                            onBlur={e => {
                                                e.currentTarget.style.borderColor = '#E5E7EB'
                                                e.currentTarget.style.boxShadow = 'none'
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                            {[50000, 100000, 200000, 500000, 1000000].map(amt => (
                                                <button key={amt} onClick={() => setReceivedAmount(String(amt))}
                                                    style={{
                                                        padding: '0.35rem 0.6rem', borderRadius: 8,
                                                        border: '1px solid #E5E7EB', background: '#F8F9FC',
                                                        color: '#6B7280', cursor: 'pointer',
                                                        fontSize: '0.72rem', fontFamily: 'inherit', minHeight: 32,
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    onMouseEnter={e => {
                                                        (e.currentTarget as HTMLElement).style.borderColor = '#E8364E'
                                                            ; (e.currentTarget as HTMLElement).style.color = '#E8364E'
                                                    }}
                                                    onMouseLeave={e => {
                                                        (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'
                                                            ; (e.currentTarget as HTMLElement).style.color = '#6B7280'
                                                    }}
                                                >{formatLAK(amt)}</button>
                                            ))}
                                            <button onClick={() => setReceivedAmount(String(totalAmount))}
                                                style={{
                                                    padding: '0.35rem 0.6rem', borderRadius: 8,
                                                    border: '1px solid #059669', background: '#ECFDF5',
                                                    color: '#059669', cursor: 'pointer',
                                                    fontSize: '0.72rem', fontFamily: 'inherit', fontWeight: 600, minHeight: 32,
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >พอดี</button>
                                        </div>

                                        {parseFloat(receivedAmount) > 0 && (
                                            <div style={{
                                                background: '#ECFDF5',
                                                borderRadius: 10,
                                                padding: '0.7rem',
                                                marginTop: 12,
                                                textAlign: 'center',
                                                border: '1px solid #A7F3D0',
                                            }}>
                                                <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>เงินทอน</div>
                                                <div style={{
                                                    fontSize: '1.3rem', fontWeight: 800,
                                                    color: parseFloat(receivedAmount) >= totalAmount ? '#059669' : '#DC2626',
                                                }}>
                                                    {parseFloat(receivedAmount) >= totalAmount
                                                        ? formatLAK(parseFloat(receivedAmount) - totalAmount)
                                                        : `ขาด ${formatLAK(totalAmount - parseFloat(receivedAmount))}`
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {paymentMethod === 'TRANSFER' && (
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <div style={{
                                            background: '#EFF6FF',
                                            borderRadius: 12,
                                            padding: '1rem',
                                            textAlign: 'center',
                                            border: '1px solid #BFDBFE',
                                        }}>
                                            <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 4 }}>ยอดโอน</div>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB' }}>{formatLAK(totalAmount)}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 4 }}>ตรวจสอบยอดโอนก่อนยืนยัน</div>
                                        </div>
                                    </div>
                                )}

                                <button onClick={confirmPayment}
                                    disabled={paymentLoading || (paymentMethod === 'CASH' && parseFloat(receivedAmount || '0') < totalAmount)}
                                    style={{
                                        width: '100%', padding: '0.8rem', borderRadius: 12, border: 'none',
                                        background: 'linear-gradient(135deg, #059669, #10B981)',
                                        color: '#fff', cursor: 'pointer', fontSize: '0.95rem',
                                        fontWeight: 700, fontFamily: 'inherit',
                                        boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
                                        opacity: paymentLoading ? 0.6 : 1, minHeight: 48,
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {paymentLoading ? '⏳ กำลังปิดบิล...' : '✅ ยืนยันการชำระเงิน'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
