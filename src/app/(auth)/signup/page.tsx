'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Check your email to confirm your account')
    router.push('/login')
  }

  return (
    <Card className="border-[#363a4f] bg-[#13141c]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-[#f0f0f6]">
          Create an account
        </CardTitle>
        <CardDescription className="text-[#c4c5d6]">
          Start automating your AirBNB research
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#f0f0f6]">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6] placeholder:text-[#9395a8]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#f0f0f6]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6] placeholder:text-[#9395a8]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#f0f0f6]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-[#c4c5d6]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#6366F1] hover:text-[#818CF8]">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
