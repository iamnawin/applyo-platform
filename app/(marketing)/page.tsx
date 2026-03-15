import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Sparkles,
  CheckCircle2,
  BarChart3,
  ListChecks,
  Globe,
  Activity,
  ArrowRight,
  Zap,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── NAVBAR ─────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-foreground/10 bg-foreground/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-background text-xl font-bold tracking-tight">
            Aplio
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-background/70 hover:text-background transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────── */}
      <section
        className="relative bg-foreground text-background pt-14 overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle, hsl(210 40% 30% / 0.25) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div className="space-y-6">
            <Badge
              variant="outline"
              className="border-background/20 text-background/70 text-xs font-mono tracking-widest uppercase"
            >
              AI-powered job applications
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight">
              Apply to 100 jobs<br />
              <span className="text-primary">in the time it</span><br />
              takes to apply to one.
            </h1>

            <p className="text-background/60 text-lg leading-relaxed max-w-md">
              Upload your resume once. Aplio&apos;s AI matches you to jobs,
              scores each one, and auto-applies across Naukri, LinkedIn & Indeed —
              only after you approve.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Link href="/signup">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-background/20 text-background hover:bg-background/10"
              >
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>

            <p className="text-background/40 text-sm font-mono">
              No credit card required · Free tier available
            </p>
          </div>

          {/* Right — mock approval queue UI */}
          <div className="hidden md:block">
            <div className="rounded-2xl border border-background/10 bg-background/5 backdrop-blur p-1 shadow-2xl">
              {/* mock window bar */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-background/10">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
                <span className="ml-3 text-xs text-background/30 font-mono">aplio.app/queue</span>
              </div>

              <div className="p-4 space-y-3">
                {/* mock queue header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-background/50 uppercase tracking-wider">Approval Queue</span>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">3 pending</span>
                </div>

                {/* mock job card 1 — highlighted */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-background">Senior React Developer</p>
                      <p className="text-xs text-background/50 mt-0.5">TechCorp India · Remote</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md shrink-0">
                      92% match
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {[['Skills', 96], ['Experience', 88], ['Location', 100], ['Salary', 84]].map(([label, val]) => (
                      <div key={label as string} className="flex items-center gap-2">
                        <span className="text-xs text-background/40 w-20 shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-background/10">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${val}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-background/50 w-8 text-right">{val}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <div className="flex-1 h-8 rounded-md border border-background/15 flex items-center justify-center text-xs text-background/40">
                      Skip
                    </div>
                    <div className="flex-1 h-8 rounded-md bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium">
                      ✓ Approve & Apply
                    </div>
                  </div>
                </div>

                {/* mock job card 2 — compact */}
                <div className="rounded-xl border border-background/10 bg-background/5 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-background truncate">Full Stack Engineer · Startupwala</p>
                    <p className="text-xs text-background/40">Bangalore · full-time</p>
                  </div>
                  <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded shrink-0">78%</span>
                </div>

                {/* mock job card 3 — compact */}
                <div className="rounded-xl border border-background/10 bg-background/5 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-background truncate">Frontend Engineer · FinPay Technologies</p>
                    <p className="text-xs text-background/40">Mumbai · hybrid</p>
                  </div>
                  <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded shrink-0">71%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* diagonal bottom edge */}
        <div className="h-10 bg-background" style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }} />
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section id="how-it-works" className="bg-background py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Three steps to your next job</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connector line — desktop only */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-border" />

            {[
              {
                n: '01',
                icon: Upload,
                title: 'Upload your resume',
                body: 'Drop your PDF once. Aplio\'s AI parses your skills, experience, and preferences into a structured profile.',
              },
              {
                n: '02',
                icon: Sparkles,
                title: 'AI matches & scores',
                body: 'Our engine scans thousands of jobs and scores each one across Skills, Experience, Location, and Salary fit.',
              },
              {
                n: '03',
                icon: CheckCircle2,
                title: 'Approve & auto-apply',
                body: 'Review your curated queue, approve the ones you like, and Aplio handles the application — fully automated.',
              },
            ].map(({ n, icon: Icon, title, body }) => (
              <div key={n} className="relative flex flex-col items-center text-center gap-4">
                <div className="relative z-10 h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <span className="absolute -top-3 -left-1 text-7xl font-black text-muted/50 leading-none select-none pointer-events-none font-mono">
                  {n}
                </span>
                <div>
                  <h3 className="font-semibold text-base mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────── */}
      <section className="bg-muted/40 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need, nothing you don&apos;t</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: BarChart3,
                title: 'AI Match Scoring',
                body: 'See a 4-dimension match breakdown — Skills, Experience, Location, and Salary — for every job in your queue.',
              },
              {
                icon: ListChecks,
                title: 'Approval Queue',
                body: 'You stay in control. Nothing gets submitted without your explicit approval. Every application, your call.',
              },
              {
                icon: Globe,
                title: 'Multi-platform Apply',
                body: 'Automated applications across Naukri, LinkedIn, and Indeed. One approval, applied everywhere.',
              },
              {
                icon: Activity,
                title: 'Application Tracker',
                body: 'Real-time status for every application: Pending → Applied → Interview → Offer. Never lose track again.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border bg-card p-6 space-y-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TWO-SIDED VALUE PROPS ───────────────────────── */}
      <section className="bg-background py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">Built for both sides</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">One platform, two wins</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* For Job Seekers */}
            <div className="rounded-2xl border bg-card p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">For candidates</p>
                  <h3 className="font-bold text-lg">Job Seekers</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Upload once, apply to hundreds of jobs automatically',
                  'AI-scored matches so you only see relevant roles',
                  'Full control via approval queue — nothing sent without you',
                  'Real-time status tracker across all applications',
                  'Saves 20+ hours per week vs. manual applications',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link href="/signup">Start applying smarter</Link>
              </Button>
            </div>

            {/* For HR Teams */}
            <div className="rounded-2xl border bg-card p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">For recruiters</p>
                  <h3 className="font-bold text-lg">HR Teams</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Receive pre-scored, pre-verified candidate profiles',
                  'AI match scores against your exact job description',
                  'Candidates ranked by fit — no more resume screening',
                  'Only see candidates who actively applied to your role',
                  'Zero setup — post a JD and receive matches instantly',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/signup">Post a job for free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────── */}
      <section
        className="relative bg-foreground text-background py-24 overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle, hsl(210 40% 30% / 0.2) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Stop applying.<br />
            <span className="text-primary">Start interviewing.</span>
          </h2>
          <p className="text-background/60 text-lg max-w-lg mx-auto">
            Join thousands of candidates who&apos;ve automated the busywork and landed more interviews in less time.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8"
          >
            <Link href="/signup">
              Get started for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="bg-foreground border-t border-background/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-background/70 text-sm font-bold tracking-tight">Aplio</span>
          <p className="text-background/30 text-xs font-mono">
            © {new Date().getFullYear()} ZeroOrigins AI. All rights reserved.
          </p>
          <nav className="flex gap-4">
            <Link href="/login" className="text-xs text-background/40 hover:text-background/70 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="text-xs text-background/40 hover:text-background/70 transition-colors">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>

    </div>
  )
}
