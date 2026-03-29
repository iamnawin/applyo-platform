'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getAuthCallbackUrl } from '@/lib/supabase/app-url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'candidate' | 'company'>('candidate')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: getAuthCallbackUrl(),
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setVerifyMessage(true)
    setLoading(false)
  }

  if (verifyMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
        <Card className="w-full max-w-sm border-white/10 text-center">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a verification link to <strong>{email}</strong>.
              Click the link to activate your account.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-sm border-white/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Start applying smarter with Aplio</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>I am a…</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('candidate')}
                  className={`rounded-xl border p-3 text-sm font-semibold transition-all ${
                    role === 'candidate'
                      ? 'border-primary/40 bg-[linear-gradient(180deg,rgba(58,135,255,0.22),rgba(16,31,63,0.88))] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_24px_rgba(17,55,145,0.18)]'
                      : 'border-input/90 bg-[linear-gradient(180deg,rgba(28,35,54,0.92),rgba(18,22,36,0.98))] text-muted-foreground hover:border-primary/25 hover:bg-accent/70 hover:text-foreground'
                  }`}
                >
                  Job Seeker
                </button>
                <button
                  type="button"
                  onClick={() => setRole('company')}
                  className={`rounded-xl border p-3 text-sm font-semibold transition-all ${
                    role === 'company'
                      ? 'border-primary/40 bg-[linear-gradient(180deg,rgba(58,135,255,0.22),rgba(16,31,63,0.88))] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_24px_rgba(17,55,145,0.18)]'
                      : 'border-input/90 bg-[linear-gradient(180deg,rgba(28,35,54,0.92),rgba(18,22,36,0.98))] text-muted-foreground hover:border-primary/25 hover:bg-accent/70 hover:text-foreground'
                  }`}
                >
                  HR / Company
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
