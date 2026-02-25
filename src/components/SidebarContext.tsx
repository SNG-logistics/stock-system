'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface SidebarContextType {
    collapsed: boolean
    setCollapsed: (v: boolean) => void
    toggle: () => void
    mobileOpen: boolean
    setMobileOpen: (v: boolean) => void
    isMobile: boolean
    isTablet: boolean
}

const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    setCollapsed: () => {},
    toggle: () => {},
    mobileOpen: false,
    setMobileOpen: () => {},
    isMobile: false,
    isTablet: false,
})

export function useSidebar() {
    return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsedState] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isTablet, setIsTablet] = useState(false)
    const [hydrated, setHydrated] = useState(false)

    // Detect screen size
    const updateSize = useCallback(() => {
        const w = window.innerWidth
        setIsMobile(w < 768)
        setIsTablet(w >= 768 && w <= 1024)
    }, [])

    useEffect(() => {
        updateSize()
        setHydrated(true)

        // Restore from localStorage
        const saved = localStorage.getItem('sidebar_collapsed')
        const w = window.innerWidth
        if (w < 768) {
            // mobile: sidebar hidden, never collapsed
            setCollapsedState(false)
            setMobileOpen(false)
        } else if (w <= 1024) {
            // tablet: default collapsed
            setCollapsedState(saved !== null ? saved === 'true' : true)
        } else {
            // desktop: default expanded
            setCollapsedState(saved !== null ? saved === 'true' : false)
        }

        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [updateSize])

    // Also update collapsed based on responsive when resizing between breakpoints
    useEffect(() => {
        if (!hydrated) return
        const w = window.innerWidth
        if (w < 768) {
            setMobileOpen(false)
        }
    }, [isMobile, hydrated])

    const setCollapsed = useCallback((v: boolean) => {
        setCollapsedState(v)
        localStorage.setItem('sidebar_collapsed', String(v))
    }, [])

    const toggle = useCallback(() => {
        if (isMobile) {
            setMobileOpen(prev => !prev)
        } else {
            setCollapsed(!collapsed)
        }
    }, [isMobile, collapsed, setCollapsed])

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle, mobileOpen, setMobileOpen, isMobile, isTablet }}>
            {children}
        </SidebarContext.Provider>
    )
}
