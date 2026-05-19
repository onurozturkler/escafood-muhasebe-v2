import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar, { BottomNav } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ flex:1, minWidth:0 }}>
        {/* Mobil topbar boşluğu — 64px, sadece mobilde görünür */}
        <div style={{ height:0 }} id="mobile-topbar-spacer" />
        <style>{`
          @media(max-width:767px){
            #mobile-topbar-spacer{ height:64px !important; }
          }
        `}</style>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 16px 80px' }}>
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
