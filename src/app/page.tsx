import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Target, Zap, Database, LineChart, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08090E]">
      {/* Header */}
      <header className="border-b border-[#2A2D42]">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-[#6366F1] flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-[#EEEEF4]">
              ListingScout
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-[#B0B0C0] hover:text-[#EEEEF4] text-sm font-medium"
            >
              Sign in
            </Link>
            <Button
              asChild
              className="bg-[#6366F1] hover:bg-[#818CF8] text-white"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-sm font-medium mb-6">
          <Zap className="h-4 w-4 mr-2" />
          Automate Your AirBNB Research
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-[#EEEEF4] mb-6 max-w-4xl mx-auto">
          Find and qualify{' '}
          <span className="text-[#6366F1]">short-term rental</span> leads at
          scale
        </h1>
        <p className="text-lg text-[#B0B0C0] mb-8 max-w-2xl mx-auto">
          ListingScout automates AirBNB listing collection, property owner
          discovery, and lead qualification. Turn hours of research into
          minutes.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Button
            asChild
            size="lg"
            className="bg-[#6366F1] hover:bg-[#818CF8] text-white"
          >
            <Link href="/signup">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-[#2A2D42] text-[#EEEEF4] hover:bg-[#161822] hover:border-[#3A3D58]"
          >
            <Link href="#features">Learn More</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-[#EEEEF4] text-center mb-12">
          Everything you need to find STR opportunities
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-[#0F1117] border border-[#2A2D42]">
            <div className="p-3 rounded-lg bg-[#6366F1]/10 w-fit mb-4">
              <Database className="h-6 w-6 text-[#6366F1]" />
            </div>
            <h3 className="text-xl font-semibold text-[#EEEEF4] mb-2">
              Centralized Database
            </h3>
            <p className="text-[#B0B0C0]">
              Collect and organize AirBNB listings with automatic deduplication.
              Never research the same listing twice.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#0F1117] border border-[#2A2D42]">
            <div className="p-3 rounded-lg bg-[#22C55E]/10 w-fit mb-4">
              <Target className="h-6 w-6 text-[#22C55E]" />
            </div>
            <h3 className="text-xl font-semibold text-[#EEEEF4] mb-2">
              Lead Scoring
            </h3>
            <p className="text-[#B0B0C0]">
              Define your criteria and let the system score each listing.
              Strong leads surface automatically.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#0F1117] border border-[#2A2D42]">
            <div className="p-3 rounded-lg bg-[#22D3EE]/10 w-fit mb-4">
              <LineChart className="h-6 w-6 text-[#22D3EE]" />
            </div>
            <h3 className="text-xl font-semibold text-[#EEEEF4] mb-2">
              Owner Discovery
            </h3>
            <p className="text-[#B0B0C0]">
              AI-powered owner research finds property owners and contact
              information with source verification.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#818CF8] p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to automate your research?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Start your free trial today. No credit card required.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-white text-[#6366F1] hover:bg-white/90"
          >
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2D42] py-8">
        <div className="container mx-auto px-6 text-center text-sm text-[#7A7A90]">
          © 2026 ListingScout. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
