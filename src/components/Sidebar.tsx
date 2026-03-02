'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from './SidebarContext'

const navItems = [
    { href: '/pos', icon: '💰', label: 'POS ขายหน้าร้าน', accent: true },
    { href: '/kitchen', icon: '🍳', label: 'จอครัว (KDS)', accent: true },
    { href: '/dashboard', icon: '🏠', label: 'Home' },
    // ─── เมนูขาย (สิ่งที่ขายให้ลูกค้า) ───
    { href: '/menu', icon: '🍽️', label: 'เมนูร้าน', dividerBefore: 'เมนู & สต็อค' },
    { href: '/recipes', icon: '📋', label: 'สูตรอาหาร (BOM)' },
    // ─── คลังสต็อค (วัตถุดิบ) ───
    { href: '/products', icon: '🥩', label: 'วัตถุดิบ / Stock' },
    { href: '/inventory', icon: '📦', label: 'สต็อคคลัง' },
    { href: '/purchase', icon: '🛒', label: 'ซื้อเข้า / GR' },
    { href: '/transfer', icon: '🔄', label: 'เบิก / โอนคลัง' },
    { href: '/adjustment', icon: '⚖️', label: 'ปรับสต็อค' },
    { href: '/sales-import', icon: '💾', label: 'นำเข้ายอดขาย' },
    { href: '/reports', icon: '📈', label: 'Reports' },
    { href: '/ai-chat', icon: '🤖', label: 'AI Assistant' },
]

const quickItems = [
    { href: '/quick-receive', icon: '⚡', label: 'รับสินค้าด่วน' },
    { href: '/quick-waste', icon: '🗑️', label: 'บันทึก Waste' },
    { href: '/qr-sheets', icon: '🖨️', label: 'พิมพ์ QR Sheet' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { collapsed, toggle, mobileOpen, setMobileOpen, isMobile } = useSidebar()

    const sidebarWidth = collapsed && !isMobile ? 68 : 240
    const showLabels = isMobile ? true : !collapsed

    // On mobile, sidebar is overlay
    const isVisible = isMobile ? mobileOpen : true

    if (!isVisible && isMobile) return null

    return (
        <>
            {/* Backdrop for mobile */}
            {isMobile && mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        zIndex: 49, backdropFilter: 'blur(2px)',
                    }}
                />
            )}

            <aside style={{
                width: sidebarWidth,
                minWidth: sidebarWidth,
                background: 'var(--white)',
                borderRight: '1px solid var(--border)',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 50,
                overflowY: 'auto',
                overflowX: 'hidden',
                transition: 'width 0.2s ease, min-width 0.2s ease',
                boxShadow: isMobile ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
            }}>
                {/* Logo + Toggle */}
                <div style={{
                    padding: collapsed && !isMobile ? '1rem 0.5rem' : '1.25rem 1.25rem',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
                    transition: 'padding 0.2s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <div style={{
                            width: 36, height: 36, minWidth: 36,
                            background: 'linear-gradient(135deg, #E8364E, #FF6B81)',
                            borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, color: '#fff',
                            boxShadow: '0 4px 12px rgba(232,54,78,0.3)',
                        }}>🍽️</div>
                        {showLabels && (
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                <p style={{ color: '#1A1D26', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>43 Garden</p>
                                <p style={{ color: '#9CA3AF', fontSize: '0.65rem', letterSpacing: '0.04em' }}>Stock System</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={toggle}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '1.1rem', color: '#9CA3AF', padding: 4,
                            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'color 0.15s',
                            minWidth: 28, minHeight: 28,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#1A1D26' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9CA3AF' }}
                        title={collapsed ? 'ขยาย Sidebar' : 'ย่อ Sidebar'}
                    >
                        {isMobile ? '✕' : collapsed ? '☰' : '←'}
                    </button>
                </div>

                {/* Nav */}
                <nav style={{
                    flex: 1,
                    padding: collapsed && !isMobile ? '0.75rem 0.35rem' : '0.75rem 0.75rem',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    transition: 'padding 0.2s ease',
                }}>
                    {navItems.map(item => {
                        const active = pathname === item.href || pathname.startsWith(item.href + '/')
                        const isPOS = item.accent
                        const divider = (item as { dividerBefore?: string }).dividerBefore

                        let bg = 'transparent'
                        let color = '#6B7280'
                        let shadow = 'none'

                        if (active && isPOS) {
                            bg = 'linear-gradient(135deg, #059669, #10B981)'
                            color = '#fff'
                            shadow = '0 2px 8px rgba(5,150,105,0.35)'
                        } else if (active) {
                            bg = '#E8364E'
                            color = '#fff'
                            shadow = '0 2px 8px rgba(232,54,78,0.25)'
                        } else if (isPOS) {
                            bg = 'rgba(5,150,105,0.06)'
                            color = '#059669'
                        }

                        return (
                            <div key={item.href}>
                                {divider && showLabels && (
                                    <div style={{
                                        margin: '10px 0 4px', paddingLeft: '0.875rem',
                                        fontSize: '0.6rem', fontWeight: 700,
                                        color: '#D1D5DB', letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        borderTop: '1px solid #F3F4F6', paddingTop: 8,
                                    }}>📂 {divider}</div>
                                )}
                                {divider && !showLabels && (
                                    <div style={{ height: 1, background: '#F3F4F6', margin: '6px 4px' }} />
                                )}
                                <Link
                                    href={item.href}
                                    onClick={() => isMobile && setMobileOpen(false)}
                                    style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: 10,
                                        padding: collapsed && !isMobile ? '0.6rem' : '0.6rem 0.875rem',
                                        borderRadius: 10,
                                        fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                                        textDecoration: 'none',
                                        transition: 'all 0.15s ease',
                                        background: bg,
                                        color: color,
                                        boxShadow: shadow,
                                        justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                                        minHeight: 40,
                                    }}
                                    onMouseEnter={e => {
                                        if (!active) {
                                            (e.currentTarget as HTMLElement).style.background = isPOS ? 'rgba(5,150,105,0.1)' : '#F3F4F6'
                                                ; (e.currentTarget as HTMLElement).style.color = isPOS ? '#047857' : '#1A1D26'
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!active) {
                                            (e.currentTarget as HTMLElement).style.background = isPOS ? 'rgba(5,150,105,0.06)' : 'transparent'
                                                ; (e.currentTarget as HTMLElement).style.color = isPOS ? '#059669' : '#6B7280'
                                        }
                                    }}
                                    title={collapsed && !isMobile ? item.label : undefined}
                                >
                                    <span style={{ fontSize: '1rem', minWidth: 20, textAlign: 'center' }}>{item.icon}</span>
                                    {showLabels && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                                </Link>
                            </div>
                        )
                    })}

                    {/* Quick Actions divider */}
                    {showLabels ? (
                        <div style={{ margin: '8px 0 4px', paddingLeft: '0.875rem', fontSize: '0.65rem', fontWeight: 700, color: '#D1D5DB', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            ⚡ Quick Actions
                        </div>
                    ) : (
                        <div style={{ margin: '8px 0 4px', textAlign: 'center' }}>
                            <div style={{ height: 1, background: '#E5E7EB', margin: '0 4px' }} />
                        </div>
                    )}

                    {quickItems.map(item => {
                        const active = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => isMobile && setMobileOpen(false)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: collapsed && !isMobile ? '0.6rem' : '0.6rem 0.875rem',
                                    borderRadius: 10,
                                    fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                                    textDecoration: 'none',
                                    transition: 'all 0.15s ease',
                                    background: active ? '#16a34a' : 'transparent',
                                    color: active ? '#fff' : '#6B7280',
                                    boxShadow: active ? '0 2px 8px rgba(22,163,74,0.25)' : 'none',
                                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                                    minHeight: 40,
                                }}
                                onMouseEnter={e => {
                                    if (!active) {
                                        (e.currentTarget as HTMLElement).style.background = '#F0FDF4'
                                            ; (e.currentTarget as HTMLElement).style.color = '#166534'
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!active) {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                                            ; (e.currentTarget as HTMLElement).style.color = '#6B7280'
                                    }
                                }}
                                title={collapsed && !isMobile ? item.label : undefined}
                            >
                                <span style={{ fontSize: '1rem', minWidth: 20, textAlign: 'center' }}>{item.icon}</span>
                                {showLabels && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                            </Link>
                        )
                    })}

                    {/* Settings */}
                    <Link href="/settings"
                        onClick={() => isMobile && setMobileOpen(false)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: collapsed && !isMobile ? '0.6rem' : '0.6rem 0.875rem',
                            borderRadius: 10, fontSize: '0.875rem', textDecoration: 'none',
                            color: '#6B7280', marginTop: 4,
                            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                            minHeight: 40,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.color = '#1A1D26' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
                        title={collapsed && !isMobile ? 'Settings' : undefined}
                    >
                        <span style={{ fontSize: '1rem', minWidth: 20, textAlign: 'center' }}>⚙️</span>
                        {showLabels && <span>Settings</span>}
                    </Link>
                </nav>

                {/* Logout */}
                <div style={{ borderTop: '1px solid #E5E7EB', padding: '0.75rem' }}>
                    <button
                        onClick={async () => {
                            await fetch('/api/auth/login', { method: 'DELETE' })
                            window.location.href = '/login'
                        }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: collapsed && !isMobile ? '0.6rem' : '0.6rem 0.875rem',
                            borderRadius: 10,
                            fontSize: '0.875rem', color: '#9CA3AF',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.15s ease',
                            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                            minHeight: 40,
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.color = '#DC2626'
                                ; (e.currentTarget as HTMLElement).style.background = '#FEF2F2'
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.color = '#9CA3AF'
                                ; (e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                        title={collapsed && !isMobile ? 'Log out' : undefined}
                    >
                        <span style={{ fontSize: '1rem', minWidth: 20, textAlign: 'center' }}>🚪</span>
                        {showLabels && <span>Log out</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}
