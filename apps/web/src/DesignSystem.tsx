import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  LayoutGrid,
  Search,
  ChevronLeft,
  Filter,
  Package,
  FileText,
  PackageOpen,
  ShoppingCart,
  Warehouse,
  ClipboardList,
  Plus,
  Minus,
  ChevronRight,
  Ellipsis,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sun,
  Moon,
} from 'lucide-react';
import {
  Button,
  Chip,
  Brand,
  SegmentedControl,
  SearchInput,
  Stepper,
  StatusToggle,
  Badge,
  Banner,
  Field,
  Input,
  PasswordInput,
  ListCard,
  RailCard,
  SectionHeader,
  BottomNav,
  InvoiceSheet,
  ThemeToggle,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from './components';

/* ---------- small demo helpers ---------- */

type PanelProps = { span: string; title: ReactNode; children: ReactNode };

function Panel({ span, title, children }: PanelProps) {
  return (
    <section
      className={`rounded-2xl border border-(--border) bg-(--surface-primary) p-[22px] ${span}`}
    >
      <h2 className="m-0 mb-4 border-b border-(--border) pb-3 text-xs font-bold uppercase tracking-[0.08em] text-(--text)">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PanelSub({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--text-muted) first:mt-0">
      {children}
    </p>
  );
}

function Swatch({ bg, name, token }: { bg: string; name: string; token: string }) {
  return (
    <div className="w-[90px]">
      <div className="mb-1.5 h-11 rounded-lg border border-(--border)" style={{ background: bg }} />
      <p className="m-0 text-[11px] font-semibold text-(--text)">{name}</p>
      <p className="m-0 font-mono text-[10px] text-(--text-muted)">{token}</p>
    </div>
  );
}

const mono = 'font-mono';

/* ---------- panels ---------- */

function BrandPanel() {
  return (
    <Panel span="md:col-span-4" title="Brand">
      <div className="mt-5 text-[30px] font-extrabold tracking-tight text-(--text)">MezMarket</div>
      <p className="m-0 mb-5 text-[13px] text-(--text-muted)">
        Business ledger &amp; inventory, simplified.
      </p>
      <p className="m-0 text-[13px] leading-relaxed text-(--text-muted)">
        Track products, batches, sales, and invoices in one place — built for small business
        operators who need clarity without spreadsheets.
      </p>
    </Panel>
  );
}

function TypographyPanel() {
  const rows: [string, string, string, string, string?][] = [
    ['H1', '32px', 'Bold', '1.2', 'text-[22px] font-extrabold'],
    ['H2', '24px', 'SemiBold', '1.3', 'text-[18px] font-bold'],
    ['H3', '20px', 'SemiBold', '1.3', 'text-base font-semibold'],
    ['H4', '16px', 'Medium', '1.4', 'text-sm font-medium'],
    ['Body Large', '16px', 'Regular', '1.6', 'text-sm'],
    ['Body Medium', '14px', 'Regular', '1.6', 'text-[13px]'],
    ['Body Small', '13px', 'Regular', '1.6', 'text-xs'],
    ['Caption', '11px', 'Regular', '1.4', 'text-[11px] text-(--text-muted)'],
  ];
  return (
    <Panel span="md:col-span-8" title="Typography">
      <div className="flex flex-wrap gap-6">
        <div className="min-w-[200px]">
          <PanelSub>Font family</PanelSub>
          <div className="mb-1 mt-1 text-[52px] font-extrabold tracking-tight text-(--text)">
            Inter
          </div>
          <p className="mb-4 max-w-[420px] text-xs leading-relaxed text-(--text-muted)">
            Grotesque sans-serif, stays legible at small sizes in dense forms and tables.
          </p>
          <PanelSub>Mono / numeric</PanelSub>
          <div className={`mb-1 mt-1 text-[34px] font-extrabold text-(--text) ${mono}`}>
            Plex Mono
          </div>
          <p className="mb-4 max-w-[420px] text-xs leading-relaxed text-(--text-muted)">
            For prices, quantities, dates — anything tabular reads as data, not prose.
          </p>
        </div>
        <table className="min-w-[280px] flex-1 border-collapse">
          <thead>
            <tr>
              <th className="pb-2.5 pr-2.5 border-b border-(--border) text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Style
              </th>
              <th className="pb-2.5 pr-2.5 border-b border-(--border) text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Size
              </th>
              <th className="pb-2.5 pr-2.5 border-b border-(--border) text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Weight
              </th>
              <th className="pb-2.5 border-b border-(--border) text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Line
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, size, weight, line, sampleClass]) => (
              <tr key={label}>
                <td
                  className={`py-3 pr-2.5 border-b border-(--border) align-middle text-(--text) ${sampleClass}`}
                >
                  {label}
                </td>
                <td className="py-3 pr-2.5 border-b border-(--border) align-middle font-mono text-xs text-(--text-muted)">
                  {size}
                </td>
                <td className="py-3 pr-2.5 border-b border-(--border) align-middle font-mono text-xs text-(--text-muted)">
                  {weight}
                </td>
                <td className="py-3 border-b border-(--border) align-middle font-mono text-xs text-(--text-muted)">
                  {line}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ColorsPanel() {
  return (
    <Panel span="md:col-span-6" title="Colors">
      <PanelSub>Base</PanelSub>
      <div className="mb-1 flex flex-wrap gap-2.5">
        <Swatch bg="var(--bg)" name="bg" token="--bg" />
        <Swatch bg="var(--surface-primary)" name="surface-primary" token="--surface-primary" />
        <Swatch
          bg="var(--surface-secondary)"
          name="surface-secondary"
          token="--surface-secondary"
        />
        <Swatch bg="var(--field)" name="field" token="--field" />
        <Swatch bg="var(--border)" name="border" token="--border" />
      </div>
      <PanelSub>Text</PanelSub>
      <div className="mb-1 flex flex-wrap gap-2.5">
        <Swatch bg="var(--text)" name="text" token="--text" />
        <Swatch bg="var(--text-muted)" name="text-(--text-muted)" token="--text-muted" />
      </div>
      <PanelSub>Accent</PanelSub>
      <div className="mb-1 flex flex-wrap gap-2.5">
        <Swatch bg="var(--accent)" name="accent" token="--accent" />
        <Swatch bg="var(--accent-hover)" name="accent-hover" token="--accent-hover" />
      </div>
      <PanelSub>Semantic</PanelSub>
      <div className="mb-1 flex flex-wrap gap-2.5">
        <Swatch bg="var(--positive)" name="positive" token="--positive" />
        <Swatch bg="var(--warning)" name="warning" token="--warning" />
        <Swatch bg="var(--danger)" name="danger" token="--danger" />
      </div>
    </Panel>
  );
}

function IconsPanel() {
  const iconDefs: { title: string; icon: ReactNode }[] = [
    { title: 'dashboard', icon: <LayoutGrid size={18} /> },
    { title: 'search', icon: <Search size={18} /> },
    { title: 'back', icon: <ChevronLeft size={18} /> },
    { title: 'filter', icon: <Filter size={18} /> },
    { title: 'products', icon: <Package size={18} /> },
    { title: 'invoices', icon: <FileText size={18} /> },
    { title: 'opened item', icon: <PackageOpen size={18} /> },
    { title: 'sells', icon: <ShoppingCart size={18} /> },
    { title: 'inventory', icon: <Warehouse size={18} /> },
    { title: 'orders', icon: <ClipboardList size={18} /> },
    { title: 'plus', icon: <Plus size={18} /> },
    { title: 'minus', icon: <Minus size={18} /> },
    { title: 'chevron', icon: <ChevronRight size={18} /> },
    { title: 'more', icon: <Ellipsis size={18} /> },
    { title: 'password show', icon: <Eye size={18} /> },
    { title: 'password hide', icon: <EyeOff size={18} /> },
    { title: 'success', icon: <CheckCircle2 size={18} /> },
    { title: 'warning', icon: <AlertTriangle size={18} /> },
    { title: 'error', icon: <XCircle size={18} /> },
    { title: 'light mode', icon: <Sun size={18} /> },
    { title: 'dark mode', icon: <Moon size={18} /> },
  ];
  return (
    <Panel span="md:col-span-3" title="Icons">
      <div className="grid grid-cols-3 gap-2.5">
        {iconDefs.map(({ title, icon }) => (
          <div
            key={title}
            title={title}
            className="flex aspect-square items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text)"
          >
            {icon}
          </div>
        ))}
      </div>
      <p className="mt-3.5 font-mono text-[11px] text-(--text-muted)">
        Line style · 2px stroke · rounded caps
      </p>
    </Panel>
  );
}

function ButtonsPanel() {
  return (
    <Panel span="md:col-span-6" title="Buttons">
      <table className="w-full border-collapse">
        <tbody>
          {(
            [
              [
                'Primary',
                <Button key="p">Button</Button>,
                <Button key="ph" className="bg-(--accent-hover)">
                  Button
                </Button>,
                <Button key="pd" disabled>
                  Button
                </Button>,
              ],
              [
                'Secondary',
                <Button key="s" variant="secondary">
                  Button
                </Button>,
                <Button key="sh" variant="secondary" className="border-(--text)">
                  Button
                </Button>,
                <Button key="sd" disabled>
                  Button
                </Button>,
              ],
              [
                'Text',
                <Button key="t" variant="text">
                  Button
                </Button>,
                <Button key="th" variant="text" className="text-(--accent-hover) underline">
                  Button
                </Button>,
                <span key="td" className="text-[13px] text-(--text-muted)">
                  —
                </span>,
              ],
            ] as [string, ReactNode, ReactNode, ReactNode][]
          ).map(([label, def, hover, disabled]) => (
            <tr key={label}>
              <td className="w-[80px] py-2 pr-3 text-xs font-semibold text-(--text-muted)">
                {label}
              </td>
              <td className="py-2 pr-3">{def}</td>
              <td className="py-2 pr-3">{hover}</td>
              <td className="py-2">{disabled}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <PanelSub>Category chips</PanelSub>
      <div className="flex flex-wrap gap-2">
        <Chip active>Products +</Chip>
        <Chip>Batches +</Chip>
        <Chip>Invoices +</Chip>
        <Chip>More +</Chip>
      </div>
    </Panel>
  );
}

function ControlsPanel() {
  const [seg, setSeg] = useState('products');
  const [count, setCount] = useState(10);
  const [status, setStatus] = useState<'pending' | 'paid'>('paid');
  return (
    <Panel span="md:col-span-6" title="Controls">
      <PanelSub>Segmented tab</PanelSub>
      <SegmentedControl
        options={[
          { value: 'products', label: 'Products' },
          { value: 'batches', label: 'Batches' },
        ]}
        value={seg}
        onChange={setSeg}
      />
      <PanelSub>Search + filter</PanelSub>
      <SearchInput placeholder="Search batch and items" onFilter={() => {}} />
      <PanelSub>Quantity stepper</PanelSub>
      <Stepper value={count} onChange={setCount} />
      <PanelSub>Status toggle</PanelSub>
      <StatusToggle
        options={[
          { value: 'pending', label: 'Pending' },
          { value: 'paid', label: 'Paid' },
        ]}
        value={status}
        onChange={(v) => setStatus(v as 'pending' | 'paid')}
      />
    </Panel>
  );
}

function InvoicePanel() {
  return (
    <Panel span="md:col-span-3" title="Bottom sheet — invoice">
      <InvoiceSheet
        items={[
          { name: 'product', qty: 'x2 pc', amount: '$3' },
          { name: 'product', qty: 'x1 kg', amount: '$10' },
        ]}
        total="$13"
        footer={
          <>
            <Button variant="secondary" className="w-full">
              Add Item
            </Button>
            <Button className="w-full">Save Invoice</Button>
          </>
        }
      />
    </Panel>
  );
}

function BottomNavPanel() {
  const [active, setActive] = useState('dashboard');
  return (
    <Panel span="md:col-span-3" title="Bottom nav">
      <BottomNav
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={16} /> },
          { key: 'sells', label: 'Sells', icon: <ShoppingCart size={16} /> },
          { key: 'inventory', label: 'Inventory', icon: <Warehouse size={16} /> },
          { key: 'orders', label: 'Orders', icon: <ClipboardList size={16} /> },
        ]}
        activeKey={active}
        onChange={setActive}
      />
      <p className="mt-3 font-mono text-[11px] text-(--text-muted)">
        Icons are placeholder — open to alternate sets.
      </p>
    </Panel>
  );
}

function CardsPanel() {
  return (
    <Panel
      span="md:col-span-8"
      title={
        <>
          Cards{' '}
          <span className="font-normal normal-case tracking-normal text-(--text-muted)">
            — list &amp; horizontal scroll, one card family
          </span>
        </>
      }
    >
      <SectionHeader icon={<FileText size={15} />} title="Invoices" onSeeMore={() => {}} />
      <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1.5">
        <RailCard
          title="INV-2042"
          meta="Jul 21 · 2:34 PM · Almaz"
          badge={<Badge tone="warning">Pending</Badge>}
        />
        <RailCard
          title="INV-2041"
          meta="Jul 21 · 1:10 PM · Almaz"
          badge={<Badge tone="positive">Paid</Badge>}
        />
        <RailCard
          title="INV-2040"
          meta="Jul 20 · 5:02 PM · Sena"
          badge={<Badge tone="danger">Overdue</Badge>}
        />
      </div>

      <SectionHeader icon={<PackageOpen size={15} />} title="Open" onSeeMore={() => {}} />
      <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1.5">
        <RailCard
          thumb={
            <div className="flex h-full w-full items-center justify-center text-(--text-muted)">
              <PackageOpen size={24} />
            </div>
          }
          title="Product Name"
        />
        <RailCard
          thumb={
            <div className="flex h-full w-full items-center justify-center text-(--text-muted)">
              <PackageOpen size={24} />
            </div>
          }
          title="Product Name"
        />
        <RailCard
          thumb={
            <div className="flex h-full w-full items-center justify-center text-(--text-muted)">
              <PackageOpen size={24} />
            </div>
          }
          title="Product Name"
        />
      </div>

      <SectionHeader icon={<Package size={15} />} title="Products" />
      <ListCard title="Product Name" meta="20 pcs left · 1 open" price="$10/u" />
      <p className="mt-3 font-mono text-[11px] text-(--text-muted)">
        Invoices &amp; Open use the horizontal <span className="font-mono">.scroll-card</span>;
        Products stays a vertical <span className="font-mono">.list-card</span> — same underlying
        slots (icon/thumb, title, meta, price, status), different container.
      </p>
    </Panel>
  );
}

function StatusPanel() {
  return (
    <Panel span="md:col-span-4" title="Status badges">
      <div className="flex flex-wrap gap-2">
        <Badge tone="positive">● Paid</Badge>
        <Badge tone="warning">● Pending</Badge>
        <Badge tone="danger">● Overdue</Badge>
        <Badge tone="neutral">● Draft</Badge>
      </div>
    </Panel>
  );
}

function BannersPanel() {
  return (
    <Panel span="md:col-span-4" title="Banners">
      <div className="flex flex-col gap-2.5">
        <Banner
          tone="success"
          title="Payment received"
          description="Invoice INV-2042 was marked as paid."
        />
        <Banner
          tone="warning"
          title="Low stock"
          description="3 products are below their reorder threshold."
        />
        <Banner
          tone="danger"
          title="Sync failed"
          description="Couldn't save the last batch update. Try again."
        />
      </div>
    </Panel>
  );
}

function FormsPanel() {
  return (
    <Panel span="md:col-span-8" title="Form inputs">
      <div className="flex max-w-[360px] flex-col gap-4">
        <Field label="Email" hint="Default — rests on --field, --border">
          <Input placeholder="you@business.com" />
        </Field>
        <Field label="Email" hint="Focus — border → --accent">
          <Input state="focus" defaultValue="you@business.com" />
        </Field>
        <Field label="Email" error="Enter a valid email address">
          <Input state="error" defaultValue="not-an-email" />
        </Field>
        <Field label="Password" hint="Hidden — eye icon shows text">
          <PasswordInput placeholder="password123" defaultValue="password123" />
        </Field>
        <Field label="Password" hint="Visible — eye-off icon hides text">
          <PasswordInput defaultValue="password123" defaultVisible />
        </Field>
      </div>
    </Panel>
  );
}

function TablePanel() {
  return (
    <Panel
      span="md:col-span-12"
      title={
        <>
          Table{' '}
          <span className="font-normal normal-case tracking-normal text-(--text-muted)">
            — head, rows &amp; cells, scrolls on small screens
          </span>
        </>
      }
    >
      <Table className="min-w-170">
        <TableHead>
          <TableRow>
            <TableHeadCell>Product</TableHeadCell>
            <TableHeadCell>On hand</TableHeadCell>
            <TableHeadCell className="text-right">Value</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Expires</TableHeadCell>
            <TableHeadCell className="text-right">Batches</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <span className="block font-semibold text-(--text)">Sierra Tequila 350 ml</span>
              <span className="mt-1 block text-xs text-(--text-muted)">Sierra Tequila</span>
            </TableCell>
            <TableCell className="whitespace-nowrap">24 cases</TableCell>
            <TableCell className="font-mono text-right tabular-nums">ETB 31,200.00</TableCell>
            <TableCell>
              <Badge tone="positive">Healthy</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap">12 Mar 2027</TableCell>
            <TableCell className="font-mono text-right tabular-nums">3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="block font-semibold text-(--text)">Cooking Oil 5 L</span>
              <span className="mt-1 block text-xs text-(--text-muted)">Sunflower</span>
            </TableCell>
            <TableCell className="whitespace-nowrap">18 bottles</TableCell>
            <TableCell className="font-mono text-right tabular-nums">ETB 2,340.00</TableCell>
            <TableCell>
              <Badge tone="warning">Low</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap">04 Jan 2027</TableCell>
            <TableCell className="font-mono text-right tabular-nums">2</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="block font-semibold text-(--text)">Loose Rice (sack)</span>
              <span className="mt-1 block text-xs text-(--text-muted)">No brand</span>
            </TableCell>
            <TableCell className="whitespace-nowrap">6 sacks</TableCell>
            <TableCell className="font-mono text-right tabular-nums">ETB 4,050.00</TableCell>
            <TableCell>
              <Badge tone="positive">Healthy</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap">—</TableCell>
            <TableCell className="font-mono text-right tabular-nums">1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="block font-semibold text-(--text)">Plain T-shirt</span>
              <span className="mt-1 block text-xs text-(--text-muted)">No brand</span>
            </TableCell>
            <TableCell className="whitespace-nowrap">3 pcs</TableCell>
            <TableCell className="font-mono text-right tabular-nums">ETB 285.00</TableCell>
            <TableCell>
              <Badge tone="danger">Out of stock</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap">—</TableCell>
            <TableCell className="font-mono text-right tabular-nums">2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Panel>
  );
}

function SpacingPanel() {
  const spacing = [4, 8, 12, 16, 24, 32, 48];
  return (
    <Panel
      span="md:col-span-3"
      title={
        <>
          <span>Spacing</span>{' '}
          <span className="font-mono font-normal normal-case tracking-normal text-(--text-muted)">
            4px base
          </span>
        </>
      }
    >
      {spacing.map((px) => (
        <div key={px} className="flex items-center gap-3 py-[7px]">
          <span className="w-[60px] font-mono text-[11px] text-(--text-muted)">{px}px</span>
          <div className="h-2 rounded-[3px] bg-(--accent)" style={{ width: px * 2.2 }} />
        </div>
      ))}
    </Panel>
  );
}

function GridPanel() {
  return (
    <Panel span="md:col-span-3" title="Grid system">
      <div className="mb-2.5 flex h-[90px] gap-1.5">
        <div className="flex-1 rounded-[3px] border border-(--border) bg-(--surface-secondary)" />
        <div className="flex-1 rounded-[3px] border border-(--border) bg-(--surface-secondary)" />
        <div className="flex-1 rounded-[3px] border border-(--border) bg-(--surface-secondary)" />
        <div className="flex-1 rounded-[3px] border border-(--border) bg-(--surface-secondary)" />
      </div>
      <div className="flex flex-col gap-1 font-mono text-[11px] text-(--text-muted)">
        <div>
          <b className="font-sans font-bold text-(--text)">Container</b> 390px
        </div>
        <div>
          <b className="font-sans font-bold text-(--text)">Columns</b> 4
        </div>
        <div>
          <b className="font-sans font-bold text-(--text)">Gutter</b> 12px
        </div>
        <div>
          <b className="font-sans font-bold text-(--text)">Margin</b> 20px
        </div>
      </div>
    </Panel>
  );
}

function ShadowsPanel() {
  const shadows: [string, string, string][] = [
    ['Small', '0 1px 2px .06', 'var(--shadow-sm)'],
    ['Medium', '0 4px 12px .08', 'var(--shadow-md)'],
    ['Large', '0 12px 24px .12', 'var(--shadow-lg)'],
  ];
  return (
    <Panel span="md:col-span-3" title="Shadows">
      <div className="grid grid-cols-2 gap-2.5">
        {shadows.map(([label, spec, value]) => (
          <div
            key={label}
            className="rounded-lg border border-(--border) bg-(--field) p-3 text-center"
          >
            <div
              className="mx-auto mb-2 h-[34px] w-[34px] border border-(--border) bg-(--surface-primary)"
              style={{ boxShadow: value }}
            />
            <div className="mb-0.5 text-[11px] font-bold text-(--text)">{label}</div>
            <p className="m-0 font-mono text-[10px] text-(--text-muted)">{spec}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RadiusPanel() {
  const radii: [string, string, string][] = [
    ['Small', '4px', '4px'],
    ['Medium', '8px', '8px'],
    ['Large', '12px', '12px'],
    ['Full', '9999px', '9999px'],
  ];
  return (
    <Panel span="md:col-span-3" title="Border radius">
      <div className="grid grid-cols-2 gap-2.5">
        {radii.map(([label, value, radius]) => (
          <div
            key={label}
            className="rounded-lg border border-(--border) bg-(--field) p-3 text-center"
          >
            <div
              className="mx-auto mb-2 h-[34px] w-[34px] border border-(--border) bg-(--surface-primary)"
              style={{ borderRadius: radius }}
            />
            <div className="mb-0.5 text-[11px] font-bold text-(--text)">{label}</div>
            <p className="m-0 font-mono text-[10px] text-(--text-muted)">{value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- page ---------- */

export function DesignSystem() {
  return (
    <div className="min-h-screen bg-(--bg) text-(--text)">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-(--border) bg-(--bg) px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <Brand />
          <span className="font-mono text-[11px] text-(--text-muted)">Design System</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[1240px] px-6 pb-[100px] pt-8">
        <div className="mb-8">
          <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-(--accent)">
            Foundations + components
          </p>
          <h1 className="m-0 mb-2 text-[34px] font-extrabold tracking-tight text-(--text)">
            MezMarket Design System
          </h1>
          <p className="m-0 max-w-[640px] text-sm leading-relaxed text-(--text-muted)">
            Derived from onboarding sketches (sign up / login / business setup) and product sketches
            (dashboard, sells, inventory, product &amp; batch detail, invoice). Layout and structure
            come from the sketches; color, type, and visual styling are defined here as tokens.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <BrandPanel />
          <TypographyPanel />
          <ColorsPanel />
          <IconsPanel />
          <ButtonsPanel />
          <ControlsPanel />
          <InvoicePanel />
          <BottomNavPanel />
          <CardsPanel />
          <StatusPanel />
          <BannersPanel />
          <FormsPanel />
          <TablePanel />
          <SpacingPanel />
          <GridPanel />
          <ShadowsPanel />
          <RadiusPanel />
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-(--border) bg-(--surface-primary) px-6 py-[22px] text-(--text)">
          <div>
            <div className="text-[15px] font-extrabold">MezMarket</div>
            <div className="mt-0.5 text-[11px] opacity-65">
              Balanced business tracking, simplified.
            </div>
          </div>
          <div className="flex gap-[18px] font-mono text-[11px] opacity-80">
            <span>Design System v1.1</span>
            <span>
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="text-xs font-semibold opacity-90">Built for clarity. Built to scale.</div>
        </footer>
      </main>
    </div>
  );
}
