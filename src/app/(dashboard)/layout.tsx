import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Type assertion for when Supabase isn't configured yet  
  const profileData = profile as {
    full_name?: string | null
    avatar_url?: string | null
    subscription_tier?: string
  } | null

  const userData = {
    email: user.email || '',
    full_name: profileData?.full_name,
    avatar_url: profileData?.avatar_url,
    subscription_tier: profileData?.subscription_tier,
  }

  return (
    <div className="flex h-screen bg-[#0A0A0F]">
      <Sidebar user={userData} />
      <main className="flex-1 overflow-auto">{children}</main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1A1A26',
            border: '1px solid #2A2A3C',
            color: '#F0F0F5',
          },
        }}
      />
    </div>
  )
}
