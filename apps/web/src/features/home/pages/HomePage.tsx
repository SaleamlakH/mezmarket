import { useState, type ComponentType, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  CodeXml,
  Copy,
  LayoutDashboard,
  Mail,
  Package,
  Scale,
  Send,
  Users,
  Wallet,
  Warehouse,
  Zap,
} from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { Brand } from '@/components/Brand';
import { Chip } from '@/components/Chip';
import { LedgerLine } from '@/components/LedgerLine';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { GithubMark } from '../components/GithubMark';
import {
  CostsIllustration,
  InventoryIllustration,
  OverviewIllustration,
  ProductIllustration,
  SaleIllustration,
  SellingIllustration,
} from '../components/Illustrations';
import { HomeHeader } from '../components/HomeHeader';
import { Reveal } from '../components/Reveal';

const CONTACT_EMAIL = 'saleamlak.7h@gmail.com';
const GITHUB_REPO_URL = 'https://github.com/SaleamlakH/mezmarket';
const TELEGRAM_URL = 'https://t.me/saleamlak_h';

const FOOTER_LINKS = [
  { label: 'Products', href: '#products' },
  { label: 'Selling', href: '#selling' },
  { label: 'Inventory', href: '#inventory' },
  { label: 'Costs', href: '#costs' },
  { label: 'Overview', href: '#overview' },
  { label: 'Open source', href: '#open-source' },
];

const FOOTER_CONTACTS = [
  { label: 'Contact', href: '#contact', external: false },
  { label: 'GitHub', href: GITHUB_REPO_URL, external: true },
  { label: 'Email', href: `mailto:${CONTACT_EMAIL}`, external: false },
  { label: 'Telegram', href: TELEGRAM_URL, external: true },
];

const PROOF_POINTS = [
  { title: 'Custom units', body: 'Your own units and prices', icon: Scale },
  { title: 'Accurate costs', body: 'Profit from the lot you bought', icon: Calculator },
  { title: 'Fast selling', body: 'A sale in a few taps', icon: Zap },
  { title: 'Shop visibility', body: 'Stock, cash, and unpaid sales', icon: LayoutDashboard },
];

const FEATURE_GRID = [
  {
    title: 'Products',
    body: 'One product with the units and prices you choose. Sell by piece, weight, shot, bottle, or a unit you define.',
    icon: Package,
  },
  {
    title: 'Inventory batches',
    body: 'Each delivery keeps its own cost, quantity, and remaining value until the last unit sells.',
    icon: Warehouse,
  },
  {
    title: 'Payments',
    body: 'Take cash, transfer, or mobile money in full or in part, and track any unpaid amount.',
    icon: Wallet,
  },
  {
    title: 'Customers',
    body: 'Attach a regular to a sale and track what they still owe. A full customer list and history are still being built.',
    icon: Users,
  },
];

const PLANNED_ITEMS = [
  'Open containers',
  'Loss records',
  'Audit trail',
  'Voids and refunds',
  'Printable invoices',
  'Staff accounts',
  'Multiple branches',
  'Product categories',
  'Customer list & history',
  'Search and filters',
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 font-mono text-xs font-bold tracking-[0.12em] uppercase text-(--accent)">
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-(--text) sm:text-3xl">{title}</h2>
      <div className="mt-3 max-w-[190px]">
        <LedgerLine />
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-(--text-muted) sm:text-[15px]">
        {body}
      </p>
    </div>
  );
}

function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 pt-10 pb-12 sm:px-6 sm:pt-12 sm:pb-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:pt-16 lg:pb-16">
      <Reveal>
        <span className="inline-flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface-secondary) px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-(--text-muted)">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--accent)" />
          Open source · Built for small shops
        </span>

        <h1 className="mt-5 text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-(--text)">
          Sell it any way you measure it.{' '}
          <span className="text-(--accent)">Know your real cost.</span>
        </h1>

        <div className="mt-5 max-w-[260px]">
          <LedgerLine />
        </div>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-(--text-muted) sm:text-[17px]">
          Pieces, bottles, shots, or kilos. Mezmarket tracks what each batch cost you, so you always
          know your real profit.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--accent-hover)"
            >
              <LayoutDashboard size={16} aria-hidden />
              Dashboard
              <ArrowRight size={16} aria-hidden />
            </Link>
          ) : (
            <Link
              to="/signup"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--accent-hover)"
            >
              Start selling
            </Link>
          )}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-(--border) bg-(--surface-primary) px-4 py-2.5 text-sm font-semibold text-(--text) transition-colors hover:border-(--border-strong) hover:bg-(--surface-secondary)"
          >
            <GithubMark className="h-4 w-4" />
            GitHub
            <ArrowUpRight size={15} aria-hidden />
          </a>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <SaleIllustration />
      </Reveal>
    </section>
  );
}

function ProofStrip() {
  return (
    <section
      aria-label="What MezMarket gets right"
      className="border-y border-(--border) bg-(--surface-primary)"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {PROOF_POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <div key={point.title} className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-(--accent)" />
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-bold text-(--text)">{point.title}</p>
                <p className="m-0 mt-0.5 text-[11px] text-(--text-muted)">{point.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NumberedSection({
  id,
  number,
  eyebrow,
  title,
  body,
  points,
  visual,
  reverse = false,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-(--border)">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <Reveal className={reverse ? 'lg:order-2' : ''}>
          <Eyebrow>
            {number} · {eyebrow}
          </Eyebrow>
          <h2 className="mt-2 max-w-xl text-2xl font-bold tracking-tight text-(--text) sm:text-3xl">
            {title}
          </h2>
          <div className="mt-3 max-w-[190px]">
            <LedgerLine />
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-(--text-muted) sm:text-[15px]">
            {body}
          </p>

          <ul className="m-0 mt-6 flex list-none flex-col gap-3 p-0">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-(--border) bg-(--surface-secondary) text-(--accent)"
                >
                  <Check size={12} />
                </span>
                <span className="text-sm leading-relaxed text-(--text)">{point}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className={reverse ? 'lg:order-1' : ''} delay={120}>
          {visual}
        </Reveal>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 border-t border-(--border)">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <SectionHeading
            eyebrow="What’s inside"
            title="The essentials, without the clutter."
            body="One place for the four things you reach for every day: products, stock, payments, and the customers behind them."
          />
        </Reveal>

        <Reveal className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" delay={120}>
          {FEATURE_GRID.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-(--border) bg-(--surface-primary) p-5 transition duration-300 hover:-translate-y-0.5 hover:border-(--accent)"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--surface-secondary) text-(--accent)"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-(--text)">{feature.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-(--text-muted)">
                  {feature.body}
                </p>
              </article>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

function OpenSourceSection() {
  return (
    <section id="open-source" className="scroll-mt-24 border-t border-(--border)">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <Reveal>
          <SectionHeading
            eyebrow="What’s next"
            title="Built in the open."
            body="MezMarket is in active development. These are planned, not live yet. Follow progress on GitHub."
          />
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="focus-ring mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-(--border) bg-(--surface-primary) px-4 py-2.5 text-sm font-semibold text-(--text) transition-colors hover:border-(--border-strong) hover:bg-(--surface-secondary)"
          >
            <GithubMark className="h-4 w-4" />
            GitHub
            <ArrowUpRight size={15} aria-hidden />
          </a>
        </Reveal>

        <Reveal
          className="rounded-2xl border border-(--border) bg-(--surface-primary) p-5"
          delay={120}
        >
          <div className="flex flex-wrap gap-2">
            {PLANNED_ITEMS.map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

type IconComponent = ComponentType<{ className?: string }>;

interface ContactMethod {
  icon: IconComponent;
  label: string;
  description: string;
  link: string;
}

const CONTACTS: ContactMethod[] = [
  {
    icon: Mail,
    label: 'Email',
    description: 'Copy the address or open your mail app',
    link: `mailto:${CONTACT_EMAIL}`,
  },
  {
    icon: Send,
    label: 'Telegram',
    description: 'Copy the link or open Telegram',
    link: TELEGRAM_URL,
  },
];

function ContactCard({ icon: Icon, label, description, link }: ContactMethod) {
  const [copied, setCopied] = useState(false);
  const copyValue = link.startsWith('mailto:') ? link.slice('mailto:'.length) : link;
  const external = link.startsWith('http');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex w-full items-center gap-4 rounded-2xl border border-(--border) bg-(--surface-primary) p-5">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-(--surface-secondary) text-(--accent)"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-(--text-muted)">
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] text-(--text-muted)">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          title={copied ? 'Copied' : `Copy ${label}`}
          className={`focus-ring inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
            copied
              ? 'border-(--accent) bg-(--surface-secondary) text-(--accent)'
              : 'border-(--border) bg-(--surface-secondary) text-(--text-muted) hover:border-(--accent) hover:bg-(--surface-primary) hover:text-(--accent)'
          }`}
        >
          <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden>
            <Copy
              size={16}
              className={`absolute transition-all duration-200 ${
                copied ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
              }`}
            />
            <Check
              size={16}
              className={`absolute transition-all duration-200 ${
                copied ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`}
            />
          </span>
          <span className="sr-only" aria-live="polite">
            {copied ? 'Copied' : ''}
          </span>
        </button>
        <a
          href={link}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          aria-label={`Open ${label}`}
          title={`Open ${label}`}
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-(--border) bg-(--surface-secondary) text-(--text-muted) transition-colors hover:border-(--accent) hover:bg-(--surface-primary) hover:text-(--accent)"
        >
          <ArrowUpRight size={16} aria-hidden />
        </a>
      </span>
    </div>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-24 border-t border-(--border)">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Talk to me"
            title="Questions about the app?"
            body="Ask about the app, what is being built, or share any comments you have."
          />
        </Reveal>

        <Reveal className="mt-8 flex flex-col gap-3 max-w-xl" delay={120}>
          {CONTACTS.map((contact) => (
            <ContactCard key={contact.label} {...contact} />
          ))}
        </Reveal>

        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg text-[12px] font-semibold text-(--text-muted) transition-colors hover:text-(--accent)"
        >
          <CodeXml size={14} aria-hidden />
          Or follow the code on GitHub
          <ArrowUpRight size={13} aria-hidden />
        </a>
      </div>
    </section>
  );
}

function ClosingCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <Reveal className="rounded-2xl border border-(--border) bg-(--surface-primary) px-6 py-10 text-center sm:px-10 sm:py-14">
        <Eyebrow>Start here</Eyebrow>
        <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-bold tracking-tight text-(--text) sm:text-4xl">
          Close the day knowing where you stand.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-(--text-muted) sm:text-[15px]">
          Start with your next sale. MezMarket keeps the rest in view.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--accent-hover)"
            >
              <LayoutDashboard size={16} aria-hidden />
              Dashboard
              <ArrowRight size={16} aria-hidden />
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--accent-hover)"
              >
                Create an account
              </Link>
              <Link
                to="/login"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-(--border) bg-(--surface-primary) px-4 py-2.5 text-sm font-semibold text-(--text) transition-colors hover:border-(--border-strong) hover:bg-(--surface-secondary)"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-(--border)">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:gap-20">
        <div>
          <Brand size="md" />
          <p className="m-0 mt-2 max-w-xs text-[12px] leading-relaxed text-(--text-muted)">
            Business tracking, simplified.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="focus-ring rounded-md text-[12px] font-semibold text-(--text-muted) transition-colors hover:text-(--text)"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {FOOTER_CONTACTS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="focus-ring rounded-md text-[12px] font-semibold text-(--text-muted) transition-colors hover:text-(--text)"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function HomePage() {
  const location = useLocation();
  const {
    session: { status },
  } = useAuthContext();
  const isAuthenticated = status === 'authenticated';

  // authed user only see the this page at /home
  // otherwise will be redirect to dashboard
  const isHome = location.pathname === '/home';
  if (isAuthenticated && !isHome) return <Navigate to="/dashboard" />;

  return (
    <div className="flex w-full self-start flex-col bg-(--bg)">
      <HomeHeader />

      <main id="main" className="flex-1">
        <HeroSection isAuthenticated={isAuthenticated} />
        <ProofStrip />
        <NumberedSection
          id="products"
          number="01"
          eyebrow="Products"
          title="Define a product once, then sell it your way."
          body="Create a product and give it the units you actually sell in, each with its own price."
          points={[
            'Name, brand, photo, and active state',
            'Add your own units, not a fixed list',
            'A separate price for every unit you sell',
          ]}
          visual={<ProductIllustration />}
        />
        <NumberedSection
          id="selling"
          number="02"
          eyebrow="Selling"
          title="A sale recorded in a few taps."
          body="Record what was sold, how it was measured, and how it was paid, and optionally attach the customer."
          points={[
            'Choose a product, pick a unit, set a quantity',
            'Paid, pending, or part-paid in one flow',
            'Receipt total checks the math before you confirm',
          ]}
          visual={<SellingIllustration />}
          reverse
        />
        <NumberedSection
          id="inventory"
          number="03"
          eyebrow="Inventory"
          title="Know what you have, and what it’s worth."
          body="Every product sits in one shelf view: what is on hand, what is running low, and what that stock is worth right now."
          points={[
            'Every product at its base unit',
            'Low-stock flags before you run out',
            'An expiry date kept with each delivery',
          ]}
          visual={<InventoryIllustration />}
        />
        <NumberedSection
          id="costs"
          number="04"
          eyebrow="Purchase costs"
          title="Your profit should reflect what you actually paid."
          body="Every delivery becomes a priced lot. Sales draw from the oldest stock first, and each receipt freezes the real cost behind it."
          points={[
            'Each purchase becomes a priced lot',
            'Sales draw oldest stock first',
            'Each sale freezes its real cost',
          ]}
          visual={<CostsIllustration />}
          reverse
        />
        <NumberedSection
          id="overview"
          number="05"
          eyebrow="Business overview"
          title="See how your shop is doing, and what needs attention."
          body="Sales, cash, profit, and unpaid sales in one place, with low stock and expiring lots surfaced together."
          points={[
            'Sales, cash collected, and unpaid sales',
            'Low stock, expiring lots, and unpaid sales',
            'Gross profit from real lot costs',
            'Payment-method and member performance',
          ]}
          visual={<OverviewIllustration />}
        />
        <FeaturesSection />
        <OpenSourceSection />
        <ContactSection />
        <ClosingCta isAuthenticated={isAuthenticated} />
      </main>

      <Footer />
    </div>
  );
}
