'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  MapPin,
  MessageCircle,
  Home,
  Search,
  CheckCircle2,
  Map,
  ArrowRight,
  BedDouble,
  Calendar,
  Star,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'

const NEIGHBORHOODS = [
  {
    name: 'Plateau-Mont-Royal',
    subtitle: 'Vibrant & walkable',
    from: 'from-blue-500',
    to: 'to-blue-700',
  },
  {
    name: 'Downtown / McGill',
    subtitle: 'Steps from campus',
    from: 'from-indigo-500',
    to: 'to-indigo-700',
  },
  {
    name: 'Mile End',
    subtitle: 'Cafés & culture',
    from: 'from-blue-400',
    to: 'to-indigo-600',
  },
  {
    name: 'NDG',
    subtitle: 'Quiet & affordable',
    from: 'from-indigo-400',
    to: 'to-blue-600',
  },
  {
    name: 'Rosemont',
    subtitle: 'Local favourite',
    from: 'from-blue-600',
    to: 'to-indigo-500',
  },
  {
    name: 'Old Montreal',
    subtitle: 'Historic charm',
    from: 'from-indigo-600',
    to: 'to-blue-800',
  },
]

const STEPS = [
  {
    icon: MapPin,
    step: '01',
    title: 'Search',
    description: 'Enter your desired neighborhood or university. Browse hundreds of verified listings on an interactive map.',
  },
  {
    icon: MessageCircle,
    step: '02',
    title: 'Connect',
    description: 'Message landlords directly through Subly. No middlemen, no agencies — just you and the landlord.',
  },
  {
    icon: Home,
    step: '03',
    title: 'Move In',
    description: 'Sign your sublease and move in hassle-free. Subly makes finding short-term housing in Montreal simple.',
  },
]

const FEATURES = [
  { icon: Map, text: 'Interactive map view with real-time listings' },
  { icon: MessageCircle, text: 'Direct in-app messaging with landlords' },
  { icon: CheckCircle2, text: 'Free to browse and free to post' },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold text-blue-600 tracking-tight">Subly</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                How it Works
              </a>
              <Link href="/map" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Browse Listings
              </Link>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/auth"
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Sign In
              </Link>
              <Link
                href="/auth"
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                Post a Sublease
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-700 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it Works
            </a>
            <Link href="/map" className="text-sm font-medium text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>
              Browse Listings
            </Link>
            <hr className="border-gray-100" />
            <Link href="/auth" className="text-sm font-medium text-gray-700 py-2">
              Sign In
            </Link>
            <Link
              href="/auth"
              className="text-sm font-semibold text-white bg-blue-600 px-4 py-2.5 rounded-lg text-center"
            >
              Post a Sublease
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative pt-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-indigo-50" />
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl pointer-events-none" />
        <div className="absolute top-32 -left-20 w-72 h-72 bg-indigo-100 rounded-full opacity-30 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Star className="w-3 h-3 fill-blue-500 text-blue-500" />
            Montreal's #1 student sublease platform
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-5 tracking-tight">
            Find Your Perfect{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Montreal Sublease
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            The easiest way for McGill and Concordia students to find and post subleases. Browse hundreds of verified listings on an interactive map — for free.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <div className="pl-4 pr-2 flex-shrink-0">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by neighborhood, university, or address…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 py-4 px-2 text-gray-800 placeholder-gray-400 text-sm bg-transparent outline-none"
              />
              <Link
                href={`/map${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
                className="m-1.5 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-3 rounded-lg transition-colors"
              >
                Search
              </Link>
            </div>
          </div>

          {/* Secondary CTAs */}
          <div className="flex items-center justify-center gap-6 mb-12">
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
            >
              <Map className="w-4 h-4" />
              Browse the Map
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/auth"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors group"
            >
              Post a Sublease
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            {[
              { icon: CheckCircle2, label: '500+ Active Listings' },
              { icon: CheckCircle2, label: 'McGill & Concordia' },
              { icon: CheckCircle2, label: 'Free to Use' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-sm text-gray-500">
                <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Simple process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">How Subly Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {STEPS.map(({ icon: Icon, step, title, description }) => (
              <div
                key={step}
                className="relative bg-blue-50 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300 group"
              >
                <div className="absolute top-6 right-6 text-blue-100 font-black text-5xl leading-none select-none">
                  {step}
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Neighborhoods ──────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Explore Montreal</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Popular Areas</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {NEIGHBORHOODS.map(({ name, subtitle, from, to }) => (
              <Link
                key={name}
                href="/map"
                className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${from} ${to} aspect-[4/3] sm:aspect-[3/2] group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
              >
                {/* Subtle texture overlay */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                  <p className="text-white font-bold text-sm sm:text-base leading-tight">{name}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-white/70 text-xs">{subtitle}</p>
                    <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Subly ──────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: copy */}
            <div>
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-4">Why Subly</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight tracking-tight">
                Built for Montreal students,{' '}
                <span className="text-blue-600">by Montreal students</span>
              </h2>
              <p className="text-gray-600 text-base leading-relaxed mb-8">
                Subly was created to solve a real problem: finding short-term housing in Montreal is hard, especially for students. We built a platform that cuts out agencies, removes the noise, and connects students directly with landlords in their community.
              </p>
              <ul className="space-y-4">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-blue-600" strokeWidth={1.75} />
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed pt-1.5">{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors shadow-sm group"
                >
                  Explore Listings
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right: mock listing card */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Listing image placeholder */}
                <div className="relative h-48 bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-4 w-16 h-16 bg-blue-400 rounded-full" />
                    <div className="absolute bottom-6 right-6 w-24 h-24 bg-indigo-400 rounded-full" />
                    <div className="absolute top-8 right-12 w-10 h-10 bg-blue-300 rounded-full" />
                  </div>
                  <Home className="w-12 h-12 text-blue-300" strokeWidth={1} />
                  {/* Price badge */}
                  <div className="absolute top-3 left-3 bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                    $1,200 / mo
                  </div>
                  {/* Available badge */}
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    Available
                  </div>
                </div>

                {/* Listing details */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-base mb-1">3½ Furnished — Plateau-Mont-Royal</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-4">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    4321 Rue Saint-Denis, Montréal
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Dates</p>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-700">May – Aug 2025</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Bedrooms</p>
                      <div className="flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-700">1 Bedroom</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/map"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    View on Map
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section className="bg-blue-600 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { value: '500+', label: 'Active Listings' },
              { value: '10+', label: 'Neighborhoods' },
              { value: '100%', label: 'Free to Use' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-4xl font-extrabold text-white mb-1">{value}</p>
                <p className="text-blue-200 text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────── */}
      <section className="bg-blue-700 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to find your next home?
          </h2>
          <p className="text-blue-200 text-base mb-10 leading-relaxed">
            Join thousands of students who found their perfect Montreal sublease on Subly. No fees, no agencies — just great listings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/map"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-blue-700 font-semibold text-sm px-8 py-3.5 rounded-lg transition-colors shadow-sm group"
            >
              Browse Subleases
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-blue-600 text-white border-2 border-white/50 hover:border-transparent font-semibold text-sm px-8 py-3.5 rounded-lg transition-all"
            >
              Post a Listing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-gray-50 border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold text-blue-600">Subly</span>
            </div>
            <p className="text-sm text-gray-500">Montreal's student sublease marketplace.</p>
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} Subly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
