"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { startSessionWatcher } from "@/utils/sessionTimeout"
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Layers,
  KeyRound,
  ChevronDown,
  UserCircle,
  ShieldAlert,
  Braces,
  Settings,
  Settings2,
  Menu,
  X,
} from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  // Desktop-only collapsed sidebar
  const [collapsed, setCollapsed] = useState(false)

  // Mobile drawer sidebar
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const [openMenus, setOpenMenus] = useState<string[]>(["Settings"])

  const tabs = [
    { name: "Home", route: "/dashboard", icon: LayoutDashboard },
    { name: "Users", route: "/dashboard/users", icon: Users },
    { name: "Policies", route: "/dashboard/policies", icon: ShieldCheck },
    { name: "Groups", route: "/dashboard/groups", icon: Layers },
    {
      name: "Settings",
      icon: Settings2,
      subItems: [
        { name: "Authentication", route: "/dashboard/settings/auth" },
        { name: "Data Forwarding", route: "/dashboard/settings/forwarding" },
      ],
    },
    { name: "Key", route: "/dashboard/key", icon: KeyRound },
    { name: "Custom Rules", route: "/dashboard/custom-rules", icon: Braces },
    { name: "Rule Configs", route: "/dashboard/rule-configurations", icon: Settings },
  ]

  const rolePermissions: Record<string, string[]> = {
    ADMIN: [
      "/dashboard",
      "/dashboard/users",
      "/dashboard/policies",
      "/dashboard/groups",
      "/dashboard/settings/auth",
      "/dashboard/settings/forwarding",
      "/dashboard/key",
      "/dashboard/profile",
      "/dashboard/custom-rules",
      "/dashboard/custom-regex",
      "/dashboard/rule-configurations",
    ],
    ORG_ADMIN: [
      "/dashboard",
      "/dashboard/users",
      "/dashboard/policies",
      "/dashboard/groups",
      "/dashboard/settings/auth",
      "/dashboard/settings/forwarding",
      "/dashboard/key",
      "/dashboard/profile",
      "/dashboard/custom-regex",
      "/dashboard/custom-rules",
      "/dashboard/rule-configurations",
    ],
    USER_MANAGER: ["/dashboard", "/dashboard/users", "/dashboard/profile", "/dashboard/key"],
    POLICY_MANAGER: [
      "/dashboard",
      "/dashboard/policies",
      "/dashboard/profile",
      "/dashboard/key",
      "/dashboard/custom-regex",
    ],
    GROUP_MANAGER: ["/dashboard", "/dashboard/groups", "/dashboard/profile", "/dashboard/key"],
    DEFAULT: ["/dashboard", "/dashboard/profile", "/dashboard/key"],
  }

  useEffect(() => {
    startSessionWatcher(() => router.push("/"))
  }, [router])

  useEffect(() => {
    async function checkSession() {
      try {
        const { apiGet } = await import("@/lib/api")
        const res: any = await apiGet("/users/auth/me")
        if (res.success && res.user) {
          setUser(res.user)
        } else {
          router.push("/")
        }
      } catch (err: any) {
        console.error("Session check failed:", err)
        // Redirect with error message to show in a toast/popup on the login page
        const errorMsg = err.message || "Session expired"
        router.push(`/?error=${encodeURIComponent(errorMsg)}`)
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [router])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const userRoles = useMemo(() => {
    if (!user?.userRole) return []
    return Array.isArray(user.userRole) ? user.userRole : [user.userRole]
  }, [user])

  const userEmail = user?.userEmail || ""

  const allowedRoutes = useMemo(() => {
    return userRoles.length > 0
      ? Array.from(new Set(userRoles.flatMap((r: any) => rolePermissions[r] || rolePermissions.DEFAULT)))
      : rolePermissions.DEFAULT
  }, [userRoles])

  useEffect(() => {
    if (!userRoles.length) return

    if (pathname.startsWith("/dashboard") && !allowedRoutes.includes(pathname)) {
      setAccessDenied(true)
      const t = setTimeout(() => {
        setAccessDenied(false)
        router.push("/dashboard")
      }, 1500)
      return () => clearTimeout(t)
    }

    if (accessDenied) setAccessDenied(false)
  }, [pathname, userRoles, allowedRoutes, router, accessDenied])


  const visibleTabs = useMemo(() => {
    return tabs
      .map((t) => {
        if (t.subItems) {
          const subs = t.subItems.filter((s) => allowedRoutes.includes(s.route))
          if (subs.length === 0) return null
          return { ...t, subItems: subs }
        }
        return allowedRoutes.includes(t.route || "") ? t : null
      })
      .filter(Boolean) as any[]
  }, [allowedRoutes])

  const activeTab =
    visibleTabs.find((t) => t.route && pathname === t.route) ||
    visibleTabs.find((t) => t.route && pathname.startsWith(t.route) && t.route !== "/dashboard") ||
    visibleTabs.flatMap((t) => t.subItems || []).find((s) => pathname.startsWith(s.route)) ||
    visibleTabs[0]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  function handleNavClick(route: string) {
    router.push(route)
    setMobileNavOpen(false)
  }

  function Sidebar({ mode }: { mode: "desktop" | "mobile" }) {
    const isDesktop = mode === "desktop"
    const widthClass = isDesktop ? (collapsed ? "w-20" : "w-72") : "w-[82vw] max-w-[320px]"

    return (
      <aside
        className={`flex flex-col shrink-0 border-r border-slate-800/70 bg-slate-950/80 backdrop-blur ${widthClass}`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          {!(!isDesktop || collapsed) && (
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
              <div>
                <div className="text-sm font-semibold text-slate-100">Prompt Protect</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Console</div>
              </div>
            </div>
          )}

          {isDesktop ? (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-2 hover:bg-slate-900/60"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : "rotate-90"}`} />
            </button>
          ) : (
            <button
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-2 hover:bg-slate-900/60"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sidebar can scroll independently if it gets tall */}
        <nav className="px-3 py-3 space-y-1 overflow-y-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const hasSubs = !!tab.subItems?.length
            const isOpen = openMenus.includes(tab.name)
            const isActive = tab.route
              ? pathname === tab.route
              : tab.subItems?.some((s: any) => pathname.startsWith(s.route))

            return (
              <div key={tab.name}>
                <button
                  onClick={() => {
                    if (hasSubs) {
                      setOpenMenus((prev) =>
                        prev.includes(tab.name) ? prev.filter((n) => n !== tab.name) : [...prev, tab.name]
                      )
                    } else if (tab.route) {
                      handleNavClick(tab.route)
                    }
                  }}
                  title={isDesktop && collapsed ? tab.name : undefined}
                  className={`w-full flex items-center rounded-2xl px-4 py-3 text-sm font-semibold border transition ${isDesktop && collapsed ? "justify-center px-0" : "gap-3"
                    } ${isActive
                      ? "border-blue-500/25 bg-blue-500/10 text-slate-100"
                      : "border-transparent text-slate-300 hover:bg-slate-900/40"
                    }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-blue-200" : "text-slate-400"}`} />
                  {(!isDesktop || !collapsed) && <span className="flex-1 text-left">{tab.name}</span>}
                  {(!isDesktop || !collapsed) && hasSubs && (
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  )}
                </button>

                {(!isDesktop || !collapsed) && hasSubs && isOpen && (
                  <div className="mt-1 ml-4 border-l border-slate-800/60 pl-2 space-y-1">
                    {tab.subItems.map((sub: any) => {
                      const isSubActive = pathname === sub.route
                      return (
                        <button
                          key={sub.route}
                          onClick={() => handleNavClick(sub.route)}
                          className={`w-full flex items-center rounded-xl px-4 py-2 text-xs font-semibold transition ${isSubActive
                            ? "bg-blue-500/10 text-blue-200"
                            : "text-slate-400 hover:bg-slate-900/30 hover:text-slate-200"
                            }`}
                        >
                          {sub.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {(!isDesktop || !collapsed) && (
          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/25 p-4">
              <div className="text-xs text-slate-400">Signed in</div>
              <div className="mt-2 text-sm font-semibold text-slate-100 truncate">{userEmail}</div>
              <div className="text-xs text-slate-400 truncate">{userRoles.join(", ") || "DEFAULT"}</div>
            </div>
          </div>
        )}
      </aside>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 overflow-hidden">
      <style>{`
        @keyframes nebula-drift {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(2%, 3%) scale(1.1) rotate(2deg); }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes drift-slow {
          from { background-position: 0% 0%; }
          to { background-position: 100% 100%; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#020617]">
        <div
          className="absolute inset-[-10%] bg-[radial-gradient(circle_at_20%_20%,rgba(29,78,216,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.1)_0%,transparent_50%)]"
          style={{ animation: "nebula-drift 25s ease-in-out infinite" }}
        />
        <div
          className="absolute inset-[-10%] bg-[radial-gradient(circle_at_70%_10%,rgba(139,92,246,0.12)_0%,transparent_50%)]"
          style={{ animation: "nebula-drift 30s ease-in-out infinite reverse" }}
        />

        <div className="absolute inset-0 opacity-40">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute h-[2px] w-[2px] rounded-full bg-white"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `star-twinkle ${2 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 5}s`
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 opacity-[0.25] [background-image:linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] [background-size:60px_60px]" />


        <div
          className="absolute inset-0 opacity-[0.03] [background-image:repeating-linear-gradient(0deg,rgba(59,130,246,0.2),rgba(59,130,246,0.2)_1px,transparent_1px,transparent_80px)]"
          style={{ animation: 'drift-slow 60s linear infinite' }}
        />

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.2] contrast-150 brightness-150 mix-blend-overlay" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.6)_100%)]" />
      </div>

      <div className="relative flex min-h-dvh">
        <div className="hidden lg:flex sticky top-0 h-dvh">
          <Sidebar mode="desktop" />
        </div>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/70" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
            <div className="absolute left-0 top-0 h-full">
              <Sidebar mode="mobile" />
            </div>
          </div>
        )}

        {/* Main column:
              - h-dvh + overflow-hidden makes THIS column the scroll system owner
              - header stays sticky
              - content scroll container spans full width so scrollbar is far right */}
        <div className="flex-1 min-w-0 h-dvh overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/55 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="lg:hidden rounded-xl border border-slate-800 bg-slate-900/30 p-2 hover:bg-slate-900/50"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs text-slate-400">Dashboard</div>
                  <div className="text-sm sm:text-base font-semibold truncate">{activeTab?.name}</div>
                </div>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/30 px-3 py-2"
                  aria-haspopup="menu"
                  aria-expanded={dropdownOpen}
                >
                  <UserCircle className="h-6 w-6 text-blue-200" />
                  <ChevronDown className="h-4 w-4" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-800 bg-slate-950">
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        router.push("/dashboard/profile")
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-900/50"
                      role="menuitem"
                    >
                      Profile
                    </button>
                    <button
                      onClick={async () => {
                        setDropdownOpen(false)
                        try {
                          const { apiPost } = await import("@/lib/api")
                          await apiPost("/users/auth/logout", {})
                        } catch (err) {
                          console.error("Logout failed", err)
                        }
                        router.push("/")
                      }}
                      className="w-full px-4 py-3 text-left text-red-200 hover:bg-red-500/10"
                      role="menuitem"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* FULL-WIDTH scroll owner so scrollbar is on the far right */}
          <div className="h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)] overflow-y-auto w-full">
            <main className="w-full px-4 sm:px-5 py-6 sm:py-8 lg:px-8">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>

          {accessDenied && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-sm rounded-3xl border border-red-500/25 bg-slate-950 p-6 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-red-300" />
                <h2 className="mt-3 text-lg font-semibold text-red-200">Access denied</h2>
                <p className="text-sm text-slate-400">Redirecting…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OverlayCard({ title, body, primaryLabel, onPrimary }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-6 text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{body}</p>
        <button onClick={onPrimary} className="mt-4 w-full rounded-xl bg-blue-500/15 px-4 py-2 hover:bg-blue-500/20">
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}

