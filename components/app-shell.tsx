"use client"

import { ReactNode, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-provider"
import { SidebarProvider, useSidebar } from "@/components/sidebar-context"

const PUBLIC_ROUTES = ["/login"]

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.includes(pathname)

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/app-shell.tsx:17',message:'AppShell useEffect: pathname changed',data:{pathname,loading,hasUser:!!user,isPublic},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (loading) return

    if (!user && !isPublic) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/app-shell.tsx:22',message:'Redirecting to login',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      router.replace("/login")
    } else if (user && isPublic) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/app-shell.tsx:25',message:'Redirecting to home',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      router.replace("/")
    }
  }, [user, isPublic, router, loading])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/app-shell.tsx:32',message:'AppShell: Error boundary setup',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const handleError = (event: ErrorEvent) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/app-shell.tsx:35',message:'Global error caught',data:{message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno,error:event.error?.toString(),pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Global error:', event.error)
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/app-shell.tsx:40',message:'Unhandled promise rejection',data:{reason:event.reason?.toString(),pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Unhandled promise rejection:', event.reason)
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        Chargement...
      </div>
    )
  }

  if (!user && !isPublic) {
    return null
  }

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <AppShellContent>{children}</AppShellContent>
    </SidebarProvider>
  )
}

function AppShellContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/app-shell.tsx:66',message:'AppShellContent: Page mounted',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  }, [pathname])

  return (
    <div className="flex">
      <Sidebar />
      <main className={`flex-1 min-h-screen transition-all duration-300 ${
        collapsed ? 'ml-20' : 'ml-64'
      }`}>{children}</main>
    </div>
  )
}
