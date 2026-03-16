'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback?next=/settings`,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setSent(true)
    toast.success('Password reset email sent')
  }

  if (sent) {
    return (
      <Card className="border-[#2A2D42] bg-[#0F1117]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-[#EEEEF4]">
            Check your email
          </CardTitle>
          <CardDescription className="text-[#B0B0C0]">
            We&apos;ve sent a password reset link to {email}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link
            href="/login"
            className="text-sm text-[#6366F1] hover:text-[#818CF8] flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-[#2A2D42] bg-[#0F1117]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-[#EEEEF4]">
          Reset password
        </CardTitle>
        <CardDescription className="text-[#B0B0C0]">
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#EEEEF4]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#161822] border-[#2A2D42] text-[#EEEEF4] placeholder:text-[#7A7A90]"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#6366F1] hover:bg-[#818CF8] text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link
          href="/login"
          className="text-sm text-[#6366F1] hover:text-[#818CF8] flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Link>
      </CardFooter>
    </Card>
  )
}
