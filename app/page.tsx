'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  MapPin,
  Search,
  ArrowRight,
  ArrowUpRight,
  MessagesSquare,
  KeyRound,
  Map as MapIcon,
  ShieldCheck,
  Users,
  Heart,
  BedDouble,
  Ruler,
  Calendar,
  Building2,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Bell,
} from 'lucide-react'
import { LISTING_TAGS } from '@/utils/listingTags'
import { requestAndSaveLocation } from '@/utils/location'
import { useAuth } from '@/app/providers'

const STEPS = [
  {
    icon: Search,
    label: 'Search',
    title: 'Find your place',
    description:
      'Explore student sublets on an interactive map. Filter by budget, move-in date, and what matters — roommates, women-only, furnished, near campus.',
  },
  {
    icon: MessagesSquare,
    label: 'Connect',
    title: 'Message directly',
    description:
      'Reach out to subletters and roommates through Subly. No agencies, no brokers, no fees — just a direct conversation.',
  },
  {
    icon: KeyRound,
    label: 'Move in',
    title: 'Sign & settle in',
    description:
      'Agree on terms, sign your sublease, and move into your next place with confidence.',
  },
]

const FEATURES = [
  {
    icon: MapIcon,
    title: 'Map-first browsing',
    description:
      'See every place in context — location is everything when you only have one semester to lock it down.',
  },
  {
    icon: Users,
    title: 'Roommates & shared places',
    description:
      'Splitting rent? Filter for roommate listings and find someone to share with before you sign.',
  },
  {
    icon: ShieldCheck,
    title: 'Rent with confidence',
    description:
      'Message hosts through Subly, see who you’re talking to, and flag anything that feels off.',
  },
  {
    icon: Heart,
    title: 'Free, always',
    description:
      'Posting and browsing are completely free. Built by students who got tired of broker fees.',
  },
]

export default function LandingPage() {
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')

  const displayName = user
    ? ((user.user_metadata?.username as string) ||
      (user.user_metadata?.name as string) ||
      user.email ||
      'Account')
    : ''

  // Ask for the visitor's location as they land, and stash it so the map can
  // spawn right there. Fires once on mount; denial/unavailability is a no-op
  // (the map simply falls back to its default view).
  useEffect(() => {
    requestAndSaveLocation()
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      {/* ─── Navigation ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
              <MapPin className="h-4 w-4 text-white" strokeWidth={2.5} />
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-slate-900">Subly</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
              How it works
            </a>
            <a href="#categories" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
              Categories
            </a>
            <Link href="/map" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
              Browse listings
            </Link>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <NotificationsMenu />
                <Link
                  href="/map?panel=messages"
                  title="Messages"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <MessagesSquare className="h-[18px] w-[18px]" />
                </Link>
                <Link
                  href="/map?panel=post"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
                >
                  Post a sublease
                </Link>
                <AccountMenu />
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
                >
                  Post a sublease
                </Link>
              </>
            )}
          </div>

          <button
            className="-mr-1 p-2 text-slate-700 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              <a href="#how" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-slate-700">
                How it works
              </a>
              <a href="#categories" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-slate-700">
                Categories
              </a>
              <Link href="/map" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-slate-700">
                Browse listings
              </Link>
              <div className="mt-3 flex flex-col gap-1 border-t border-slate-100 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-2.5 px-1 py-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate text-sm font-semibold text-slate-900">{displayName}</span>
                    </div>
                    <Link href="/map?panel=messages" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 py-2.5 text-sm text-slate-700">
                      <MessagesSquare className="h-4 w-4 text-slate-400" /> Messages
                    </Link>
                    <Link href="/map" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 py-2.5 text-sm text-slate-700">
                      <Bell className="h-4 w-4 text-slate-400" /> Notifications
                    </Link>
                    <Link href="/map?panel=mine" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 py-2.5 text-sm text-slate-700">
                      <Building2 className="h-4 w-4 text-slate-400" /> My listings
                    </Link>
                    <Link href="/map?panel=saved" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 py-2.5 text-sm text-slate-700">
                      <Heart className="h-4 w-4 text-slate-400" /> Saved listings
                    </Link>
                    <Link href="/map?panel=post" onClick={() => setMobileOpen(false)} className="mt-2 rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white">
                      Post a sublease
                    </Link>
                    <button
                      onClick={async () => {
                        setMobileOpen(false)
                        await signOut()
                      }}
                      className="flex items-center gap-2.5 py-2.5 text-sm font-medium text-red-600"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth" className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700">
                      Sign in
                    </Link>
                    <Link href="/auth" className="rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white">
                      Post a sublease
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200">
        {/* Faint dotted texture, masked to fade toward edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(#dbe1ea 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 38%, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 38%, black 30%, transparent 80%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-5 pb-20 pt-20 text-center sm:px-8 sm:pt-28">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            The student housing marketplace
          </div>

          <h1 className="text-balance font-serif text-[2.6rem] font-medium leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            Subleases &amp; roommates,
            <br className="hidden sm:block" /> made for students.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            Subly maps student housing wherever you study — find a place to sublet, a roommate to
            split it with, and hosts who get student life. No brokers, no fees.
          </p>

          {/* Search */}
          <form
            action="/map"
            className="mx-auto mt-9 flex max-w-xl items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.18)] focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-900/5"
          >
            <span className="pl-3 text-slate-400">
              <Search className="h-[18px] w-[18px]" />
            </span>
            <input
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city, neighbourhood, or campus…"
              className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quiet trust line */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
            <span className="font-medium text-slate-700">Roommates &amp; subleases</span>
            <span className="text-slate-300">·</span>
            <span>Any city, any campus</span>
            <span className="text-slate-300">·</span>
            <span>Always free to post</span>
          </div>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────── */}
      <section id="how" className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-blue-600">How it works</p>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">
              From searching to settling in, in three steps.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, label, title, description }, i) => (
              <div key={label} className="bg-white p-7 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="font-serif text-sm tabular-nums text-slate-300">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ─────────────────────────────────────────── */}
      <section id="categories" className="border-b border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-blue-600">Categories</p>
              <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">
                Find your kind of place.
              </h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">
                Every listing is tagged, so you can filter for exactly what you need —
                a roommate, a women-only home, somewhere furnished near campus.
              </p>
            </div>
            <Link
              href="/map"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition-colors hover:text-blue-700"
            >
              Browse the map
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LISTING_TAGS.map(({ id, label, description, icon: Icon }) => (
              <Link
                key={id}
                href="/map"
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_30px_-18px_rgba(37,99,235,0.4)]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600" />
                </div>
                <div className="mt-8">
                  <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{label}</h3>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Subly + sample listing ─────────────────────────── */}
      <section className="border-b border-slate-200">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-20">
          {/* Left: copy */}
          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium text-blue-600">Why Subly</p>
            <h2 className="mt-3 max-w-md font-serif text-3xl font-medium leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Built for students, by students.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">
              Finding a place shouldn&apos;t mean scrolling endless group chats or paying a
              broker. We put every listing on one honest, map-first platform — and keep it free.
            </p>

            <div className="mt-10 space-y-7">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link
                href="/map"
                className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Explore the map
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Right: realistic listing card */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
              {/* Map-snapshot styled media */}
              <div className="relative h-52 bg-slate-100">
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />
                {/* faint "road" diagonals */}
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-70"
                  style={{
                    backgroundImage:
                      'linear-gradient(115deg, transparent 47%, #dbe4ee 47%, #dbe4ee 53%, transparent 53%)',
                    backgroundSize: '120px 120px',
                  }}
                />
                {/* center pin */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 shadow-lg ring-4 ring-white">
                    <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={2.25} />
                  </span>
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
                  5 min to campus
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  Available now
                </span>
              </div>

              {/* Details */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
                      Sunny room in a shared 3½
                    </h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      Steps from campus
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tracking-tight text-slate-900">$720</p>
                    <p className="text-xs text-slate-400">/ month</p>
                  </div>
                </div>

                {/* Tag chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['Roommate wanted', 'Women only', 'Furnished'].map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="h-4 w-4 text-slate-400" /> 1 bed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Ruler className="h-4 w-4 text-slate-400" /> 520 ft²
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" /> May–Aug
                  </span>
                </div>

                <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                  <MessagesSquare className="h-4 w-4" />
                  Message subletter
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stat proof ─────────────────────────────────────────── */}
      <section className="border-b border-slate-200">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-slate-200 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
          {[
            { value: '$0', label: 'In fees', sub: 'free to post & browse' },
            { value: '100%', label: 'Direct', sub: 'no brokers, no middlemen' },
            { value: 'Global', label: 'Reach', sub: 'any city, any campus' },
          ].map(({ value, label, sub }) => (
            <div key={label} className="px-2 py-12 text-center sm:px-8">
              <p className="font-serif text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">
                {value}
              </p>
              <p className="mt-3 text-sm font-medium text-slate-900">{label}</p>
              <p className="text-sm text-slate-500">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-blue-600 px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(ellipse 60% 70% at 50% 40%, black, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 70% at 50% 40%, black, transparent 75%)',
            }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-serif text-3xl font-medium tracking-tight text-white sm:text-[2.75rem] sm:leading-[1.1]">
              Your next place is on the map.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-blue-100">
              Join the students already finding sublets and roommates on Subly — no fees, no brokers, no hassle.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/map"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 sm:w-auto"
              >
                Browse subleases
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/0 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Post a listing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
                  <MapPin className="h-4 w-4 text-white" strokeWidth={2.5} />
                </span>
                <span className="text-[17px] font-semibold tracking-tight text-slate-900">Subly</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-slate-500">
                Student subleases &amp; roommates, on a map. Find a place, or post yours — always free.
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <Link href="/map" className="flex items-center gap-1.5 text-slate-600 transition-colors hover:text-slate-900">
                <Building2 className="h-4 w-4 text-slate-400" /> Browse listings
              </Link>
              <a href="#how" className="text-slate-600 transition-colors hover:text-slate-900">
                How it works
              </a>
              <a href="#categories" className="text-slate-600 transition-colors hover:text-slate-900">
                Categories
              </a>
              {user ? (
                <Link href="/map?panel=mine" className="text-slate-600 transition-colors hover:text-slate-900">
                  My listings
                </Link>
              ) : (
                <Link href="/auth" className="text-slate-600 transition-colors hover:text-slate-900">
                  Sign in
                </Link>
              )}
            </nav>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Subly. Built for students, everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Signed-in profile dropdown for the landing header — mirrors the map's account
// menu, but links into the map where listings/messages live.
function AccountMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!user) return null

  const displayName =
    (user.user_metadata?.username as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    'Account'

  const items = [
    { href: '/map', icon: MapIcon, label: 'Browse the map' },
    { href: '/map?panel=mine', icon: Building2, label: 'My listings' },
    { href: '/map?panel=saved', icon: Heart, label: 'Saved listings' },
    { href: '/map?panel=messages', icon: MessagesSquare, label: 'Messages' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold text-white">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[8rem] truncate">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
            {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
          </div>
          {items.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 text-slate-400" /> {label}
            </Link>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={async () => {
              setOpen(false)
              await signOut()
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// Placeholder notifications shown in the landing header — mirrors the map's
// bell so the signed-in experience is consistent across both. Swap the static
// items for a real feed (e.g. the `notifications` table) when it's wired up.
const SAMPLE_NOTIFICATIONS = [
  { title: 'New matching listing', detail: 'A room near campus was just posted' },
  { title: 'New message', detail: 'A host replied to your inquiry' },
]

function NotificationsMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!user) return null

  const count = SAMPLE_NOTIFICATIONS.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {count} new
            </span>
          </div>
          {SAMPLE_NOTIFICATIONS.map((n) => (
            <div
              key={n.title}
              className="flex gap-2.5 px-4 py-2.5 transition-colors hover:bg-slate-50"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <Bell className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                <p className="truncate text-xs text-slate-500">{n.detail}</p>
              </div>
            </div>
          ))}
          <div className="border-t border-slate-100 px-4 pb-1 pt-2">
            <Link
              href="/map"
              onClick={() => setOpen(false)}
              className="block py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Open the map →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
