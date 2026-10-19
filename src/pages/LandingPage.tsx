import { useState } from 'react'
import { ArrowDown, ArrowRight, Bolt, Check, Leaf, MoveUpRight, Waves, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeSelector } from '../components/ThemeSelector'
import { PwaInstallButton } from '../components/PwaInstallButton'
import { formatNumber, formatPeso } from '../lib/calculations'

const defaultHours = 8
const fanWatts = 60
const rate = 12
const daysPerMonth = 30

export function LandingPage() {
  const [hoursPerDay, setHoursPerDay] = useState(defaultHours)
  const monthlyKwh = fanWatts * hoursPerDay * daysPerMonth / 1000
  const monthlyCost = monthlyKwh * rate
  const savedKwh = fanWatts * (defaultHours - hoursPerDay) * daysPerMonth / 1000
  const savedCost = savedKwh * rate

  return (
    <main className="landing-page min-h-screen overflow-hidden bg-blue-50 text-blue-950">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-3" aria-label="Pagsibol Energy Study home">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-300 text-blue-950">
            <Bolt size={22} fill="currentColor" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight text-blue-950">Pagsibol <span className="font-normal text-blue-500">/ energy study</span></span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-400">Naic, Cavite</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-xs font-semibold text-blue-700 md:flex" aria-label="Main">
          <a href="#method" className="transition hover:text-blue-950">How it works</a>
          <a href="#example" className="transition hover:text-blue-950">Try an example</a>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeSelector compactOnMobile />
          <PwaInstallButton compactOnMobile />
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-xl bg-blue-950 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 sm:px-4">
            Sign in <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section id="top" className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1.03fr_0.97fr] lg:gap-14 lg:pb-28">
        <div className="relative z-10">
          <p className="mb-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
            <span className="size-2 rounded-full bg-amber-400" />
            A household energy field guide
          </p>
          <h1 className="max-w-2xl font-serif text-5xl font-medium leading-[1.04] tracking-tight text-blue-950 sm:text-6xl lg:text-7xl">
            Know what is<br />using power at <span className="relative whitespace-nowrap">home.<span className="landing-underline" /></span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-blue-700 sm:text-lg sm:leading-8">
            Make sense of your electricity bill, one appliance at a time. Explore how everyday schedules shape monthly energy use, then test a different plan.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-800">
              Build your household profile <MoveUpRight size={16} />
            </Link>
            <a href="#example" className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3.5 text-sm font-semibold text-blue-800 transition hover:border-blue-400">
              Try the live example <ArrowDown size={15} />
            </a>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-blue-500">
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-700" /> Your data stays in your account</span>
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-700" /> Estimates you can follow</span>
          </div>
        </div>

        <div id="example" className="landing-calc relative scroll-mt-8 rounded-[1.75rem] bg-blue-950 p-5 text-white shadow-2xl shadow-blue-950/15 sm:p-7">
          <div className="landing-sun absolute -right-10 -top-12 size-48 rounded-full border border-amber-300/20" />
          <div className="landing-sun landing-sun-inner absolute -right-1 -top-3 size-28 rounded-full border border-amber-300/25" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">A small, live example</p>
                <h2 className="mt-2 font-serif text-2xl text-white sm:text-3xl">One electric fan</h2>
              </div>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-amber-300"><Waves size={21} /></span>
            </div>
            <p className="mt-3 max-w-md text-xs leading-5 text-blue-200">Change the daily hours. The monthly estimate updates immediately using the same transparent calculation as the study.</p>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="example-hours" className="text-xs font-semibold text-blue-100">Hours used per day</label>
                <output htmlFor="example-hours" className="rounded-lg bg-amber-300 px-2.5 py-1 text-sm font-bold tabular-nums text-blue-950">{formatNumber(hoursPerDay, 1)} h</output>
              </div>
              <input
                id="example-hours"
                type="range"
                min="0"
                max="16"
                step="0.5"
                value={hoursPerDay}
                onChange={(event) => setHoursPerDay(Number(event.target.value))}
                className="mt-4 w-full accent-amber-300"
                aria-label="Adjust electric fan daily usage hours"
              />
              <div className="mt-1 flex justify-between text-[10px] text-blue-300"><span>Off</span><span>8 hours</span><span>16 hours</span></div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 text-blue-950">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-500">Monthly energy</p>
                <p className="mt-2 font-serif text-3xl tabular-nums">{formatNumber(monthlyKwh, 2)} <span className="font-sans text-xs font-semibold text-blue-500">kWh</span></p>
                <p className="mt-1 text-[10px] text-blue-400">60 W · 30 days</p>
              </div>
              <div className="rounded-2xl bg-amber-300 p-4 text-blue-950">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-800">Estimated cost</p>
                <p className="mt-2 font-serif text-3xl tabular-nums">{formatPeso(monthlyCost)}</p>
                <p className="mt-1 text-[10px] text-blue-800">at ₱12 per kWh</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-blue-200">
              <Zap size={15} className="mt-0.5 shrink-0 text-amber-300" />
              <p>{hoursPerDay === defaultHours
                ? 'Move the slider to see the estimate change. This example uses illustrative values.'
                : savedKwh > 0
                  ? `Compared with 8 hours per day, this schedule uses ${formatNumber(savedKwh, 2)} kWh less, about ${formatPeso(savedCost)} at the example rate.`
                  : `Compared with 8 hours per day, this schedule uses ${formatNumber(Math.abs(savedKwh), 2)} kWh more, about ${formatPeso(Math.abs(savedCost))} at the example rate.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="method" className="border-y border-blue-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">No mystery math</p>
            <h2 className="mt-3 max-w-sm font-serif text-3xl leading-tight text-blue-950 sm:text-4xl">A clear estimate, from numbers you know.</h2>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-950 sm:gap-3 sm:p-5">
              <span>Watts</span><span className="text-amber-600">×</span>
              <span>Quantity</span><span className="text-amber-600">×</span>
              <span>Hours a day</span><span className="text-amber-600">×</span>
              <span>Days a month</span><span className="text-amber-600">÷ 1,000</span>
              <span className="rounded-lg bg-blue-950 px-2.5 py-1 text-white">kWh / month</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-blue-600">The conversion from watt-hours to kilowatt-hours is the same one used in the appliance estimate. Estimated cost is monthly kWh multiplied by the rate you enter.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">From bill to better questions</p>
            <h2 className="mt-3 font-serif text-3xl text-blue-950 sm:text-4xl">A useful routine, not a spreadsheet.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-blue-600">Start with what you already know. Add detail only when it helps you make a decision.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { n: '01', title: 'Start with your bill', body: 'Record your actual monthly kWh, bill amount, and electricity rate in one quick step.', icon: Leaf },
            { n: '02', title: 'Pick your appliances', body: 'Choose common household items from a searchable library, then adjust estimates to match your home.', icon: Bolt },
            { n: '03', title: 'Try a different schedule', body: 'Change proposed hours and compare projected use and cost before saving a new routine.', icon: Waves },
          ].map(({ n, title, body, icon: Icon }) => (
            <article key={n} className="landing-step group rounded-2xl border border-blue-100 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-300 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm text-blue-400">{n} / 03</span>
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-amber-300 group-hover:text-blue-950"><Icon size={19} /></span>
              </div>
              <h3 className="mt-7 font-serif text-xl font-semibold text-blue-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-blue-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-8 sm:pb-20">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-amber-300 px-5 py-8 sm:px-9 sm:py-10">
          <div className="landing-cta-ring pointer-events-none absolute -right-16 -top-28 size-72 rounded-full border border-blue-950/15" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-800">Take the first step</p>
              <h2 className="mt-2 max-w-xl font-serif text-3xl leading-tight text-blue-950 sm:text-4xl">Start with the bill on your table.</h2>
              <p className="mt-2 text-sm text-blue-900">Create your private household profile and explore your own numbers.</p>
            </div>
            <Link to="/login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-800">
              Open your workspace <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-blue-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-semibold text-blue-800">Pagsibol 4A Subdivision · Naic, Cavite</p>
          <p>Estimates are illustrative and depend on the values entered. They are not a utility bill or a guaranteed saving.</p>
        </div>
      </footer>
    </main>
  )
}
