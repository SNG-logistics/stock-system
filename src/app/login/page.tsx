'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ username: '', password: '' })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`ยินดีต้อนรับ ${data.data.name}`)
                router.push('/dashboard')
            } else {
                toast.error(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: '#F8F9FA',
            fontFamily: "'Noto Sans Thai', 'Noto Sans Lao', sans-serif",
        }}>
            {/* Left panel — brand */}
            <div style={{
                width: '45%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(160deg, #E8162A 0%, #9B1020 100%)',
                padding: '3rem',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', top: '40%', right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

                <div style={{ position: 'relative', textAlign: 'center' }}>
                    <div style={{
                        width: 90, height: 90, borderRadius: 24,
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem', fontSize: 42,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    }}>
                        🍽️
                    </div>

                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}>
                        43 Garden
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                        Stock Management System
                    </p>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1.5rem', marginBottom: '2rem' }}>
                        <p style={{ color: 'white', fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.5, marginBottom: 6 }}>
                            รู้ต้นทุนทุกจาน
                        </p>
                        <p style={{ color: 'white', fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.5, marginBottom: 12 }}>
                            รู้กำไรทุกวัน
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', lineHeight: 1.7 }}>
                            ระบบจัดการสต็อคที่ออกแบบมาสำหรับ
                            ร้านอาหารที่อยากเติบโตอย่างมั่นคง
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
                        {[
                            { icon: '📉', text: 'ลดของเสีย ลดต้นทุนซื้อ' },
                            { icon: '⚡', text: 'ตัดสต็อคอัตโนมัติจาก POS ทุกออเดอร์' },
                            { icon: '📊', text: 'รายงานต้นทุน-กำไรรายวัน รายเดือน' },
                            { icon: '🤖', text: 'AI ช่วยวางสูตรและคำนวณ BOM' },
                        ].map(f => (
                            <div key={f.icon} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
                                <span>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p style={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                    43 Garden Cafe & Restaurant · Vientiane, Lao PDR
                </p>
            </div>

            {/* Right panel — form */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '2rem',
            }}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginBottom: 6 }}>เข้าสู่ระบบ</h2>
                        <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>กรอกชื่อผู้ใช้และรหัสผ่านของคุณ</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                ชื่อผู้ใช้
                            </label>
                            <input
                                type="text"
                                value={form.username}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                style={{
                                    width: '100%', padding: '0.7rem 1rem',
                                    background: 'white', border: '1.5px solid #E5E7EB',
                                    borderRadius: 12, color: '#111827',
                                    fontSize: '0.9rem', outline: 'none',
                                    fontFamily: 'inherit', transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                placeholder="username"
                                required
                                onFocus={e => {
                                    e.target.style.borderColor = '#E8162A'
                                    e.target.style.boxShadow = '0 0 0 3px rgba(232,22,42,0.1)'
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = '#E5E7EB'
                                    e.target.style.boxShadow = 'none'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                รหัสผ่าน
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                style={{
                                    width: '100%', padding: '0.7rem 1rem',
                                    background: 'white', border: '1.5px solid #E5E7EB',
                                    borderRadius: 12, color: '#111827',
                                    fontSize: '0.9rem', outline: 'none',
                                    fontFamily: 'inherit', transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                placeholder="••••••••"
                                required
                                onFocus={e => {
                                    e.target.style.borderColor = '#E8162A'
                                    e.target.style.boxShadow = '0 0 0 3px rgba(232,22,42,0.1)'
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = '#E5E7EB'
                                    e.target.style.boxShadow = 'none'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '0.825rem',
                                marginTop: 4,
                                background: loading ? '#FECACA' : '#E8162A',
                                color: 'white', fontWeight: 700,
                                fontSize: '0.925rem',
                                borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 4px 14px rgba(232,22,42,0.35)',
                                transition: 'all 0.2s', fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => {
                                if (!loading) {
                                    (e.currentTarget as HTMLElement).style.background = '#C0111F'
                                        ; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(232,22,42,0.45)'
                                        ; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                                }
                            }}
                            onMouseLeave={e => {
                                if (!loading) {
                                    (e.currentTarget as HTMLElement).style.background = '#E8162A'
                                        ; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(232,22,42,0.35)'
                                        ; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                                }
                            }}
                        >
                            {loading ? '⏳ กำลังเข้าสู่ระบบ...' : '🔓 เข้าสู่ระบบ'}
                        </button>
                    </form>

                    {/* Quick credentials hint */}
                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            🔑 Default Credentials
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                            {[
                                ['owner', 'owner1234'], ['manager', 'manager1234'],
                                ['warehouse', 'staff1234'], ['cashier', 'staff1234'],
                            ].map(([u, p]) => (
                                <button key={u} onClick={() => setForm({ username: u, password: p })} style={{
                                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                                    padding: '2px 0', fontFamily: 'monospace', fontSize: '0.72rem', color: '#DC2626'
                                }}>
                                    {u} / {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
