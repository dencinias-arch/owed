import React, { useState, useMemo, useEffect } from "react";
import {
  Home, ListChecks, PlusCircle, Activity, Settings as SettingsIcon,
  Bell, ChevronRight, ChevronLeft, Briefcase, RotateCcw, Shield, CreditCard,
  HeartPulse, Users, HandCoins, Percent, KeyRound, Circle, Search,
  FileText, MessageSquare, DollarSign, AlertTriangle, CheckCircle2,
  Clock, Paperclip, Copy, Check, X, Trash2, PenLine, Send, Plus,
  CalendarDays, Filter, User, Download, Lock, HelpCircle, Star, ArrowDownLeft,
  Book, Wrench, Utensils, Shirt, Package, ExternalLink, Camera
} from "lucide-react";

/* ---------------- utilities ---------------- */

const DAY = 24 * 60 * 60 * 1000;
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (n) => new Date(today().getTime() + n * DAY);
const iso = (d) => d.toISOString().slice(0, 10);
const parseISO = (s) => { const d = new Date(s + "T00:00:00"); return d; };
const fmtMoney = (n) =>
  "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const fmtDate = (s) => {
  if (!s) return "—";
  const d = parseISO(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fmtDateLong = (s) => {
  if (!s) return "—";
  return parseISO(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};
const daysFromToday = (s) => Math.round((parseISO(s).getTime() - today().getTime()) / DAY);

/* ---------------- payment links ---------------- */

const PAY_PLATFORMS = [
  { id: "venmo",   label: "Venmo" },
  { id: "cashapp", label: "Cash App" },
  { id: "paypal",  label: "PayPal" },
];
const payLink = (platform, handle, amount) => {
  if (!handle) return "";
  const h = handle.replace(/^[@$]/, "").trim();
  const amt = amount ? String(+(+amount).toFixed(2)) : "";
  if (platform === "venmo") return `https://venmo.com/u/${h}`;
  if (platform === "cashapp") return `https://cash.app/$${h}${amt ? "/" + amt : ""}`;
  if (platform === "paypal") return `https://paypal.me/${h}${amt ? "/" + amt : ""}`;
  return "";
};
const PERSON_CATS = ["shared", "loan", "other"];

/* ---------------- mock screenshot extraction ---------------- */

const MOCK_SCAN = {
  owedBy: "Delta Air Lines",
  amount: "218.40",
  description: "Refund for cancelled ATL connection",
  category: "refund",
  method: "Original card",
  reference: "DL-REF-88213",
  notes: "Imported from screenshot of the refund confirmation email.",
  recurring: false,
};

const MOCK_SCAN_STUFF = {
  owedBy: "",
  amount: "",
  description: "Kafka on the Shore (hardcover)",
  category: "book",
  method: "", reference: "",
  notes: "Identified from your photo: hardcover book, good condition.",
  recurring: false,
};

/* ---------------- payer status links ---------------- */

const PAYER_LINKS = [
  { match: ["american express", "amex"], label: "American Express", url: "https://www.americanexpress.com" },
  { match: ["geico"],                    label: "GEICO",            url: "https://www.geico.com/claims/" },
  { match: ["navan"],                    label: "Navan",            url: "https://navan.com" },
  { match: ["benepass"],                 label: "Benepass",         url: "https://www.getbenepass.com" },
  { match: ["delta"],                    label: "Delta",            url: "https://www.delta.com" },
  { match: ["chase"],                    label: "Chase",            url: "https://www.chase.com" },
  { match: ["venmo"],                    label: "Venmo",            url: "https://venmo.com" },
];
const findPayerLink = (owedBy) => {
  const s = (owedBy || "").toLowerCase();
  const hit = PAYER_LINKS.find((p) => p.match.some((m) => s.includes(m)));
  if (hit) return { known: true, label: hit.label, url: hit.url };
  return { known: false, label: owedBy, url: "https://www.google.com/search?q=" + encodeURIComponent(owedBy + " check refund status") };
};

/* ---------------- domain data ---------------- */

const CATEGORIES = [
  { id: "work",      label: "Work reimbursement",   Icon: Briefcase },
  { id: "refund",    label: "Refund",               Icon: RotateCcw },
  { id: "insurance", label: "Insurance",            Icon: Shield },
  { id: "card",      label: "Credit card benefit",  Icon: CreditCard },
  { id: "medical",   label: "Medical reimbursement",Icon: HeartPulse },
  { id: "shared",    label: "Shared expense",       Icon: Users },
  { id: "loan",      label: "Loan repayment",       Icon: HandCoins },
  { id: "rebate",    label: "Rebate",               Icon: Percent },
  { id: "deposit",   label: "Security deposit",     Icon: KeyRound },
  { id: "other",     label: "Other",                Icon: Circle },
];
const STUFF_CATS = [
  { id: "book",     label: "Book",        Icon: Book },
  { id: "tools",    label: "Tools",       Icon: Wrench },
  { id: "kitchen",  label: "Kitchen",     Icon: Utensils },
  { id: "clothing", label: "Clothing",    Icon: Shirt },
  { id: "gear",     label: "Gear",        Icon: Package },
  { id: "misc",     label: "Other thing", Icon: Circle },
];
const ALL_CATS = [...CATEGORIES, ...STUFF_CATS];
const catById = (id) => ALL_CATS.find((c) => c.id === id) || CATEGORIES[9];
const isStuff = (it) => it.kind === "stuff";

const STATUSES = {
  preparing:       { label: "Preparing",          tone: "neutral" },
  submitted:       { label: "Submitted",          tone: "neutral" },
  approved:        { label: "Approved",           tone: "info" },
  payment_pending: { label: "Payment pending",    tone: "info" },
  partial:         { label: "Partially received", tone: "amber" },
  received:        { label: "Received",           tone: "green" },
  disputed:        { label: "Disputed",           tone: "red" },
  lent:            { label: "Lent out",           tone: "info" },
  returned:        { label: "Returned",           tone: "green" },
};

const CLOSED = ["received", "disputed", "returned"];
const isOpen = (it) => !CLOSED.includes(it.status);
const isOverdue = (it) => isOpen(it) && it.expectedDate && daysFromToday(it.expectedDate) < 0;
const remaining = (it) => Math.max(0, +(it.amount - it.received).toFixed(2));

/* ---------------- seed data ---------------- */

let idc = 100;
const nid = () => String(++idc);

const seedItems = [
  {
    id: "1", owedBy: "American Express", description: "CLEAR membership statement credit",
    category: "card", amount: 219, received: 0, status: "payment_pending",
    submittedDate: iso(addDays(-12)), expectedDate: iso(addDays(8)),
    method: "Statement credit", reference: "AMX-2231-CLR",
    notes: "Annual CLEAR credit on the Platinum card. Posts after membership renewal clears.",
    reminderDate: iso(addDays(6)), recurring: true, docs: [{ id: "d1", name: "clear-renewal-receipt.pdf", type: "PDF", date: iso(addDays(-12)) }],
  },
  {
    id: "2", owedBy: "Employer", description: "Chicago work travel reimbursement",
    category: "work", amount: 684.35, received: 0, status: "submitted",
    submittedDate: iso(addDays(-6)), expectedDate: iso(addDays(14)),
    method: "Payroll", reference: "EXP-88412",
    notes: "Flights, hotel, and meals for the Chicago onsite. Submitted through Expensify.",
    reminderDate: iso(addDays(10)), recurring: false, docs: [{ id: "d2", name: "chicago-expense-report.pdf", type: "PDF", date: iso(addDays(-6)) }],
  },
  {
    id: "3", owedBy: "Online retailer", description: "Returned walking pad refund",
    category: "refund", amount: 97, received: 0, status: "payment_pending",
    submittedDate: iso(addDays(-19)), expectedDate: iso(addDays(-5)),
    method: "Original card", reference: "RMA-55219",
    notes: "Return delivered and scanned at warehouse. Refund not issued yet.",
    reminderDate: iso(addDays(0)), recurring: false, docs: [{ id: "d3", name: "return-tracking.png", type: "Image", date: iso(addDays(-17)) }],
  },
  {
    id: "4", owedBy: "Alex", description: "Shared dinner expense",
    category: "shared", amount: 63.5, received: 30, status: "partial",
    submittedDate: iso(addDays(-9)), expectedDate: iso(addDays(2)),
    method: "Venmo", reference: "",
    notes: "Birthday dinner split. Alex sent $30, said the rest is coming after payday.",
    reminderDate: iso(addDays(3)), recurring: false, docs: [],
  },
  {
    id: "5", owedBy: "Insurance company", description: "Auto insurance repair reimbursement",
    category: "insurance", amount: 1150, received: 0, status: "approved",
    submittedDate: iso(addDays(-21)), expectedDate: iso(addDays(3)),
    method: "Direct deposit", reference: "CLM-2026-04471",
    notes: "Claim approved. Adjuster confirmed payment is in the next disbursement run.",
    reminderDate: iso(addDays(4)), recurring: false, docs: [{ id: "d4", name: "claim-approval-letter.pdf", type: "PDF", date: iso(addDays(-4)) }],
  },
  {
    id: "6", owedBy: "Employer", description: "Wellness benefit reimbursement",
    category: "work", amount: 120, received: 120, status: "received",
    submittedDate: iso(addDays(-30)), expectedDate: iso(addDays(-10)),
    method: "Payroll", reference: "WEL-Q2-2026",
    notes: "Quarterly wellness stipend for gym membership.",
    reminderDate: "", recurring: true, docs: [],
    receivedDate: iso(addDays(-10)),
  },
  {
    id: "7", kind: "stuff", owedBy: "Marcus", description: "American Tabloid (paperback)",
    category: "book", amount: 0, received: 0, status: "lent",
    submittedDate: iso(addDays(-24)), expectedDate: iso(addDays(-3)),
    method: "", reference: "", notes: "Lent after we talked about Ellroy at trivia night.",
    reminderDate: iso(addDays(0)), recurring: false, docs: [],
  },
  {
    id: "8", kind: "stuff", owedBy: "Sam next door", description: "Cordless drill and bit set",
    category: "tools", amount: 0, received: 0, status: "lent",
    submittedDate: iso(addDays(-4)), expectedDate: iso(addDays(5)),
    method: "", reference: "", notes: "For the shelf project. Battery charger went with it.",
    reminderDate: iso(addDays(4)), recurring: false, docs: [],
  },
];

const seedActivities = [
  { id: "a9",  itemId: "7", type: "created", text: "American Tabloid lent to Marcus", date: iso(addDays(-24)) },
  { id: "a10", itemId: "8", type: "created", text: "Drill lent to Sam next door", date: iso(addDays(-4)) },
  { id: "a1",  itemId: "6", type: "payment", text: "Payment received from Employer", amount: 120, date: iso(addDays(-10)) },
  { id: "a2",  itemId: "5", type: "status",  text: "Insurance claim approved", date: iso(addDays(-4)) },
  { id: "a3",  itemId: "4", type: "payment", text: "Partial payment received from Alex", amount: 30, date: iso(addDays(-3)) },
  { id: "a4",  itemId: "3", type: "followup",text: "Follow-up sent to online retailer", date: iso(addDays(-2)) },
  { id: "a5",  itemId: "1", type: "status",  text: "Amex credit moved to payment pending", date: iso(addDays(-2)) },
  { id: "a6",  itemId: "2", type: "created", text: "Chicago travel reimbursement submitted", date: iso(addDays(-6)) },
  { id: "a7",  itemId: "2", type: "document",text: "Expense report attached", date: iso(addDays(-6)) },
  { id: "a8",  itemId: "6", type: "closed",  text: "Wellness reimbursement closed", date: iso(addDays(-10)) },
];

const seedNotifications = [
  { id: "n1", Icon: Clock,        title: "Payment expected tomorrow", body: "Insurance repair reimbursement ($1,150) is expected within days.", time: "2h ago", tone: "info" },
  { id: "n2", Icon: AlertTriangle,title: "Payment overdue",           body: "Walking pad refund ($97) is 5 days past its expected date.", time: "Today", tone: "red" },
  { id: "n3", Icon: MessageSquare,title: "Follow-up due",             body: "You planned to nudge Alex about the remaining $33.50 today.", time: "Today", tone: "amber" },
  { id: "n4", Icon: ArrowDownLeft,title: "Partial payment received",  body: "Alex sent $30 toward the shared dinner expense.", time: "3d ago", tone: "green" },
  { id: "n5", Icon: Paperclip,    title: "Document missing",          body: "The shared dinner expense has no receipt attached.", time: "3d ago", tone: "neutral" },
  { id: "n6", Icon: CreditCard,   title: "Benefit expiring soon",     body: "Your CLEAR statement credit window closes at renewal. Confirm it posts.", time: "5d ago", tone: "amber" },
  { id: "n7", Icon: Book,         title: "Time to nudge Marcus",      body: "Your copy of American Tabloid was due back 3 days ago.", time: "Today", tone: "amber" },
  { id: "n8", Icon: CalendarDays, title: "Your weekly summary",       body: "$2,213.85 in motion, 2 items need a nudge, 2 things out on loan.", time: "2d ago", tone: "neutral" },
];

/* ---------------- follow-up templates ---------------- */

const TONES = ["Friendly", "Professional", "Direct", "Firm", "Escalation"];
function draftFollowUp(item, tone) {
  if (isStuff(item)) {
    const thing = item.description;
    const lent = fmtDateLong(item.submittedDate);
    switch (tone) {
      case "Friendly":
        return `Hey! Whenever you get a chance, could I grab the ${thing} back? Zero rush, just doing a sweep of stuff I've loaned out. Hope you're getting good use out of it!`;
      case "Professional":
        return `Hi, quick note: I lent you the ${thing} on ${lent} and I'd like to get it back when convenient. Could we figure out a good time this week?`;
      case "Direct":
        return `Hey, I need the ${thing} back. I lent it on ${lent}. When can you drop it off or should I swing by?`;
      case "Firm":
        return `Following up again on the ${thing} I lent you on ${lent}. I need it back this week. Let me know which day works and I'll make it easy.`;
      case "Escalation":
        return `This is my last ask on the ${thing}, lent ${lent}. If returning it isn't going to happen, tell me straight and I'll replace it, but I'd rather just have it back. Can we settle this by the weekend?`;
      default:
        return "";
    }
  }
  const amt = fmtMoney(remaining(item) || item.amount);
  const what = item.description.toLowerCase();
  const sub = fmtDateLong(item.submittedDate);
  const exp = fmtDateLong(item.expectedDate);
  const ref = item.reference ? ` The confirmation number is ${item.reference}.` : "";
  switch (tone) {
    case "Friendly":
      return `Hi! Quick check-in on the ${what}. I submitted it on ${sub} and was expecting ${amt} around ${exp}.${ref} No rush, just wanted to make sure it didn't slip through the cracks. Thanks so much!`;
    case "Professional":
      return `Hello,\n\nI'm following up on the ${what} submitted on ${sub}. The expected payment of ${amt} was due by ${exp} and has not yet been received.${ref}\n\nCould you confirm the current status and an updated payment date?\n\nThank you.`;
    case "Direct":
      return `Following up on the ${what}: ${amt} was submitted on ${sub} with payment expected by ${exp}.${ref} Please confirm when payment will be issued.`;
    case "Firm":
      return `This is my second follow-up regarding the ${what}. The payment of ${amt}, submitted on ${sub}, was due on ${exp} and remains outstanding.${ref} I need written confirmation of the payment date within 3 business days.`;
    case "Escalation":
      return `I am escalating the outstanding payment for the ${what}. ${amt} was submitted on ${sub} and was due ${exp}.${ref} Despite prior follow-ups, it remains unpaid. Please escalate to a supervisor and provide a resolution timeline within 2 business days, or advise the formal dispute process.`;
    default:
      return "";
  }
}

/* ---------------- small components ---------------- */

const Ring = ({ pct, size = 76, stroke = 6, color = "var(--green)", track = "rgba(255,255,255,.25)", children, animate }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={animate ? { transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" } : {}} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
};

const Pill = ({ status }) => {
  const s = STATUSES[status];
  return <span className={`pill pill-${s.tone}`}>{s.label}</span>;
};

const CatIcon = ({ id, size = 18 }) => {
  const { Icon } = catById(id);
  return <Icon size={size} strokeWidth={1.75} />;
};

/* ---------------- item card ---------------- */

const ItemCard = ({ item, onOpen }) => {
  const stuff = isStuff(item);
  const d = item.expectedDate ? daysFromToday(item.expectedDate) : null;
  const overdue = isOverdue(item);
  let when = "";
  if (item.status === "received") when = "Received " + fmtDate(item.receivedDate || item.expectedDate);
  else if (item.status === "returned") when = "Returned " + fmtDate(item.receivedDate || item.expectedDate);
  else if (d === null) when = "No date set";
  else if (overdue) when = `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} overdue`;
  else if (d === 0) when = stuff ? "Due back today" : "Expected today";
  else when = `${d} day${d === 1 ? "" : "s"} left · ${fmtDate(item.expectedDate)}`;
  return (
    <button className="card item-card" onClick={onOpen}>
      <div className={`cat-badge ${overdue ? "cat-red" : ""} ${stuff ? "cat-stuff" : ""}`}><CatIcon id={item.category} /></div>
      <div className="item-mid">
        <div className="item-who">{stuff ? item.description : item.owedBy}</div>
        <div className="item-desc">{stuff ? `with ${item.owedBy}` : item.description}</div>
        <div className={`item-when ${overdue ? "text-red" : ""}`}>{when}</div>
      </div>
      <div className="item-right">
        {!stuff && <div className="item-amt">{fmtMoney(item.status === "partial" ? remaining(item) : item.amount)}</div>}
        {item.status === "partial" && <div className="item-sub">of {fmtMoney(item.amount)}</div>}
        <Pill status={item.status} />
        {overdue && <span className="pill pill-red" style={{ marginTop: 4 }}>Overdue</span>}
      </div>
    </button>
  );
};

/* ---------------- dashboard ---------------- */

function Dashboard({ items, user, go, openItem, openNotifs }) {
  const active = items.filter(isOpen);
  const moneyActive = active.filter((i) => !isStuff(i));
  const stuffOut = active.filter(isStuff);
  const outstanding = moneyActive.reduce((s, i) => s + remaining(i), 0);
  const overdueAmt = moneyActive.filter(isOverdue).reduce((s, i) => s + remaining(i), 0);
  const next30 = moneyActive.filter((i) => i.expectedDate && daysFromToday(i.expectedDate) >= 0 && daysFromToday(i.expectedDate) <= 30)
    .reduce((s, i) => s + remaining(i), 0);
  const recoveredPct = user.recovered / (user.recovered + outstanding || 1);
  const upcoming = moneyActive.filter((i) => !isOverdue(i) && i.expectedDate)
    .sort((a, b) => daysFromToday(a.expectedDate) - daysFromToday(b.expectedDate)).slice(0, 3);
  const attention = active.filter((i) => isOverdue(i) || i.status === "partial");
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="page">
      <header className="dash-head">
        <div>
          <div className="eyebrow">{dateStr}</div>
          <h1 className="h1">Good morning, {user.name.split(" ")[0]}</h1>
        </div>
        <div className="head-actions">
          <button className="icon-btn" onClick={openNotifs} aria-label="Notifications">
            <Bell size={20} /><span className="dot" />
          </button>
          <div className="avatar">{user.name[0]}</div>
        </div>
      </header>

      <section className="hero card">
        <div className="hero-top">
          <div>
            <div className="hero-label">Still coming back to you</div>
            <div className="hero-amt">{fmtMoney(outstanding)}</div>
            <div className="hero-sub">{moneyActive.length} open item{moneyActive.length === 1 ? "" : "s"}{stuffOut.length > 0 ? ` · ${stuffOut.length} thing${stuffOut.length === 1 ? "" : "s"} on loan` : ""}</div>
          </div>
          <Ring pct={recoveredPct} color="var(--green-bright)" track="rgba(255,255,255,.18)">
            <div className="ring-lbl">
              <div className="ring-pct">{Math.round(recoveredPct * 100)}%</div>
              <div className="ring-cap">back</div>
            </div>
          </Ring>
        </div>
        <div className="hero-stats">
          <div className="hstat">
            <div className="hstat-v text-red-soft">{fmtMoney(overdueAmt)}</div>
            <div className="hstat-l">Overdue</div>
          </div>
          <div className="hstat">
            <div className="hstat-v">{fmtMoney(next30)}</div>
            <div className="hstat-l">Next 30 days</div>
          </div>
          <div className="hstat">
            <div className="hstat-v text-green-soft">{fmtMoney(user.recovered)}</div>
            <div className="hstat-l">Recovered</div>
          </div>
        </div>
      </section>

      <section className="quick-row">
        <button className="quick" onClick={() => go("add")}><Plus size={18} /><span>Add item</span></button>
        <button className="quick" onClick={() => go("items", "Overdue")}><AlertTriangle size={18} /><span>Review overdue</span></button>
        <button className="quick" onClick={() => go("items", "Active")}><ArrowDownLeft size={18} /><span>Record payment</span></button>
      </section>

      <section>
        <div className="sec-head">
          <h2 className="h2">Coming up</h2>
          <button className="link" onClick={() => go("items", "Active")}>See all</button>
        </div>
        <div className="stack">
          {upcoming.map((i) => <ItemCard key={i.id} item={i} onOpen={() => openItem(i.id)} />)}
          {upcoming.length === 0 && <div className="empty small">Nothing scheduled. Add something you're waiting on.</div>}
        </div>
      </section>

      {stuffOut.length > 0 && (
        <section>
          <div className="sec-head">
            <h2 className="h2">Out on loan</h2>
            <button className="link" onClick={() => go("items", "All")}>See all</button>
          </div>
          <div className="stack">
            {stuffOut.filter((i) => !isOverdue(i)).map((i) => <ItemCard key={i.id} item={i} onOpen={() => openItem(i.id)} />)}
            {stuffOut.every(isOverdue) && <div className="empty small">Everything on loan is overdue. Check Needs attention below.</div>}
          </div>
        </section>
      )}

      {attention.length > 0 && (
        <section>
          <div className="sec-head">
            <h2 className="h2">Needs attention</h2>
          </div>
          <div className="stack">
            {attention.map((i) => <ItemCard key={i.id} item={i} onOpen={() => openItem(i.id)} />)}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------------- items page ---------------- */

function ItemsPage({ items, initialTab, openItem }) {
  const [tab, setTab] = useState(initialTab || "Active");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("date");
  const [showFilters, setShowFilters] = useState(false);

  const [kind, setKind] = useState("all");

  const filtered = useMemo(() => {
    let list = items.slice();
    if (tab === "Active") list = list.filter((i) => isOpen(i) && !isOverdue(i));
    if (tab === "Overdue") list = list.filter(isOverdue);
    if (tab === "Received") list = list.filter((i) => CLOSED.includes(i.status) && i.status !== "disputed");
    if (kind === "money") list = list.filter((i) => !isStuff(i));
    if (kind === "stuff") list = list.filter(isStuff);
    if (cat !== "all") list = list.filter((i) => i.category === cat);
    if (q) list = list.filter((i) => (i.owedBy + " " + i.description).toLowerCase().includes(q.toLowerCase()));
    list.sort((a, b) => {
      if (sort === "amount") return remaining(b) - remaining(a);
      if (sort === "who") return a.owedBy.localeCompare(b.owedBy);
      const da = a.expectedDate ? daysFromToday(a.expectedDate) : 9999;
      const db = b.expectedDate ? daysFromToday(b.expectedDate) : 9999;
      return da - db;
    });
    return list;
  }, [items, tab, q, cat, sort, kind]);

  return (
    <div className="page">
      <h1 className="h1 pad-h">Owed items</h1>
      <div className="tabs">
        {["Active", "Overdue", "Received", "All"].map((t) => (
          <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="search-row">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search by name or description" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className={`icon-btn ${showFilters ? "on" : ""}`} onClick={() => setShowFilters(!showFilters)} aria-label="Filters">
          <Filter size={18} />
        </button>
      </div>
      <div className="chip-row">
        {[["all", "Everything"], ["money", "Money"], ["stuff", "Stuff"]].map(([k, l]) => (
          <button key={k} className={`chip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>{l}</button>
        ))}
      </div>
      {showFilters && (
        <div className="filter-panel card">
          <label className="f-label">Category
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="all">All categories</option>
              {ALL_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="f-label">Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Expected date</option>
              <option value="amount">Amount</option>
              <option value="who">Person or company</option>
            </select>
          </label>
        </div>
      )}
      <div className="stack">
        {filtered.map((i) => <ItemCard key={i.id} item={i} onOpen={() => openItem(i.id)} />)}
        {filtered.length === 0 && (
          <div className="empty">
            <div className="empty-ring"><Circle size={28} strokeWidth={1.5} /></div>
            <p><strong>Nothing here yet.</strong></p>
            <p>When you add money you're waiting on, it shows up in this list.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- add item ---------------- */

const blankForm = () => ({
  owedBy: "", amount: "", description: "", category: "work",
  submittedDate: iso(today()), expectedDate: "", method: "", reference: "",
  notes: "", reminderDate: "", recurring: false, doc: "",
});

function AddItem({ onSave, onCancel }) {
  const [f, setF] = useState(blankForm());
  const [more, setMore] = useState(false);
  const [mode, setMode] = useState("scan"); // scan | manual
  const [kind, setKind] = useState("money"); // money | stuff
  const [scanning, setScanning] = useState(false);
  const [imported, setImported] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const stuff = kind === "stuff";
  const valid = f.owedBy.trim() && f.description.trim() && f.expectedDate && (stuff || +f.amount > 0);

  const pickKind = (k) => {
    setKind(k);
    setF({ ...f, category: k === "stuff" ? "book" : "work" });
  };

  const runScan = (target, fileName) => {
    setScanning(true);
    setTimeout(() => {
      if (target === "stuff") {
        setF({
          ...blankForm(), ...MOCK_SCAN_STUFF,
          submittedDate: iso(today()), expectedDate: iso(addDays(14)),
          reminderDate: iso(addDays(10)), doc: fileName || "item-photo.jpg",
        });
        setKind("stuff");
      } else {
        setF({
          ...blankForm(), ...MOCK_SCAN,
          submittedDate: iso(addDays(-2)), expectedDate: iso(addDays(10)),
          reminderDate: iso(addDays(7)), doc: fileName || "screenshot.png",
        });
        setKind("money");
      }
      setScanning(false); setImported(true); setMode("manual"); setMore(true);
    }, 1600);
  };

  if (mode === "scan") return (
    <div className="page">
      <h1 className="h1 pad-h">Add to Owed</h1>
      <div className="seg">
        <button className="on">Snap a pic</button>
        <button onClick={() => setMode("manual")}>Enter manually</button>
      </div>
      {scanning ? (
        <div className="scan-zone card">
          <div className="spinner" />
          <p><strong>Reading your photo…</strong></p>
          <p className="hint center">Figuring out what this is, who's involved, and any amounts or dates.</p>
        </div>
      ) : (
        <>
          <div className="scan-zone card">
            <div className="empty-ring"><Camera size={24} strokeWidth={1.5} /></div>
            <p><strong>Snap or upload a pic</strong></p>
            <p className="hint center">A refund email, order page, or payment request, or a photo of something you're lending out. Owed figures out what it is and fills in the details for you to confirm.</p>
            <label className="btn primary sm scan-pick">
              Choose a photo
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const file = e.target.files && e.target.files[0]; runScan("money", file ? file.name : ""); }} />
            </label>
            <div className="chip-row" style={{ justifyContent: "center", marginTop: 6 }}>
              <button className="chip" onClick={() => runScan("money", "delta-refund-email.png")}>Try: refund email</button>
              <button className="chip" onClick={() => runScan("stuff", "book-photo.jpg")}>Try: photo of an item</button>
            </div>
          </div>
          <div className="hint center">Prototype note: recognition is simulated here. The real app reads your actual photo, whether it's a receipt or the thing itself.</div>
        </>
      )}
    </div>
  );

  return (
    <div className="page">
      <h1 className="h1 pad-h">Add to Owed</h1>
      <div className="seg">
        <button onClick={() => { setMode("scan"); setImported(false); }}>Snap a pic</button>
        <button className="on">Enter manually</button>
      </div>
      <div className="chip-row">
        <button className={`chip ${!stuff ? "on" : ""}`} onClick={() => pickKind("money")}>Money owed to me</button>
        <button className={`chip ${stuff ? "on" : ""}`} onClick={() => pickKind("stuff")}>Something I lent</button>
      </div>
      {imported ? (
        <div className="import-banner">
          <CheckCircle2 size={16} />
          <span>{stuff ? "Looks like something you're lending. We guessed the name and category, so fix anything and add who has it." : "Imported from your pic. Check the details, edit anything, then save."}</span>
        </div>
      ) : (
        <p className="lede pad-h">{stuff ? "Track a thing you lent out so it actually comes back." : "Just the basics to start. You can add details anytime."}</p>
      )}

      <div className="form card">
        {stuff ? (
          <>
            <label className="f-label">What did you lend? <span className="req">required</span>
              <input placeholder="e.g., Cordless drill, hardcover of Dune" value={f.description} onChange={set("description")} />
            </label>
            <label className="f-label">Who has it? <span className="req">required</span>
              <input placeholder="Person's name" value={f.owedBy} onChange={set("owedBy")} />
            </label>
          </>
        ) : (
          <>
            <label className="f-label">Who owes you? <span className="req">required</span>
              <input placeholder="Company or person" value={f.owedBy} onChange={set("owedBy")} />
            </label>
            <label className="f-label">Amount expected <span className="req">required</span>
              <div className="amt-wrap"><span>$</span>
                <input type="number" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={set("amount")} />
              </div>
            </label>
            <label className="f-label">What is it for? <span className="req">required</span>
              <input placeholder="e.g., March travel reimbursement" value={f.description} onChange={set("description")} />
            </label>
          </>
        )}
        <div className="f-label">Category
          <div className="cat-grid">
            {(stuff ? STUFF_CATS : CATEGORIES).map((c) => (
              <button key={c.id} className={`cat-chip ${f.category === c.id ? "on" : ""}`} onClick={() => setF({ ...f, category: c.id })}>
                <c.Icon size={16} strokeWidth={1.75} /><span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="f-label">{stuff ? "When should it come back?" : "Expected payment date"} <span className="req">required</span>
          <input type="date" value={f.expectedDate} onChange={set("expectedDate")} />
        </label>

        <button className="link disclosure" onClick={() => setMore(!more)}>
          {more ? "Hide extra details" : "Add more details"} <ChevronRight size={14} style={{ transform: more ? "rotate(90deg)" : "none", transition: ".2s" }} />
        </button>

        {more && (
          <div className="more">
            <label className="f-label">{stuff ? "Date lent" : "Date submitted"}
              <input type="date" value={f.submittedDate} onChange={set("submittedDate")} />
            </label>
            {!stuff && (
              <>
                <label className="f-label">Payment method
                  <input placeholder="Direct deposit, Venmo, statement credit…" value={f.method} onChange={set("method")} />
                </label>
                <label className="f-label">Reference or confirmation number
                  <input placeholder="Optional" value={f.reference} onChange={set("reference")} />
                </label>
              </>
            )}
            <label className="f-label">Notes
              <textarea rows={3} placeholder="Anything future-you should know" value={f.notes} onChange={set("notes")} />
            </label>
            <label className="f-label">{stuff ? "Photo of the item" : "Receipt or supporting document"}
              <div className="upload" onClick={() => setF({ ...f, doc: f.doc ? "" : (stuff ? "item-photo.jpg" : "receipt.pdf") })}>
                <Paperclip size={16} />
                <span>{f.doc ? f.doc + " attached" : "Tap to attach a file"}</span>
              </div>
            </label>
            <label className="f-label">Remind me to follow up
              <input type="date" value={f.reminderDate} onChange={set("reminderDate")} />
            </label>
            {!stuff && (
              <label className="f-check">
                <input type="checkbox" checked={f.recurring} onChange={set("recurring")} />
                This repeats (monthly, quarterly, or annually)
              </label>
            )}
          </div>
        )}
      </div>

      <div className="btn-row">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary" disabled={!valid} onClick={() => onSave({ ...f, kind })}>Save item</button>
      </div>
    </div>
  );
}

/* ---------------- item detail ---------------- */

function ItemDetail({ item, user, activities, onBack, onUpdate, onDelete, onFollowUp, onPayment, onReturned, onLog }) {
  const stuff = isStuff(item);
  const [copiedPlat, setCopiedPlat] = useState("");
  const copyPay = (pid, url) => {
    try { navigator.clipboard?.writeText(url); } catch (e) {}
    setCopiedPlat(pid); setTimeout(() => setCopiedPlat(""), 1500);
  };
  const [statusOpen, setStatusOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const overdue = isOverdue(item);
  const rem = remaining(item);
  const timeline = activities.filter((a) => a.itemId === item.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const c = catById(item.category);

  return (
    <div className="page">
      <div className="detail-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back"><ChevronLeft size={20} /></button>
        <button className="icon-btn danger" onClick={onDelete} aria-label="Delete item"><Trash2 size={18} /></button>
      </div>

      <div className="detail-hero">
        <div className="cat-badge lg"><c.Icon size={22} strokeWidth={1.75} /></div>
        {stuff ? (
          <div className="detail-amt detail-thing">{item.description}</div>
        ) : (
          <>
            <div className="detail-amt">{fmtMoney(rem || item.amount)}</div>
            <div className="detail-desc">{item.description}</div>
          </>
        )}
        <div className="detail-who">{stuff ? `with ${item.owedBy}` : `from ${item.owedBy}`}</div>
        <div className="detail-pills">
          <Pill status={item.status} />
          {overdue && <span className="pill pill-red">{Math.abs(daysFromToday(item.expectedDate))} days overdue</span>}
        </div>
        {!stuff && item.received > 0 && item.status !== "received" && (
          <div className="partial-bar">
            <div className="partial-fill" style={{ width: `${(item.received / item.amount) * 100}%` }} />
            <span>{fmtMoney(item.received)} received · {fmtMoney(rem)} remaining</span>
          </div>
        )}
      </div>

      <div className="action-grid">
        <button className="act" onClick={() => setStatusOpen(!statusOpen)}><PenLine size={17} /><span>Update status</span></button>
        <button className="act" onClick={() => setNoteOpen(!noteOpen)}><FileText size={17} /><span>Add note</span></button>
        <button className="act" onClick={() => onLog({ type: "document", text: stuff ? "Photo attached: item-photo.jpg" : "Document attached: supporting-doc.pdf" }, { docs: [...(item.docs || []), { id: nid(), name: stuff ? "item-photo.jpg" : "supporting-doc.pdf", type: stuff ? "Image" : "PDF", date: iso(today()) }] })}><Paperclip size={17} /><span>{stuff ? "Add photo" : "Add document"}</span></button>
        <button className="act" onClick={onFollowUp}><Send size={17} /><span>{stuff ? "Nudge them" : "Send follow-up"}</span></button>
        {stuff ? (
          <button className="act green" onClick={onReturned}><CheckCircle2 size={17} /><span>Mark returned</span></button>
        ) : (
          <button className="act green" onClick={onPayment}><ArrowDownLeft size={17} /><span>Record payment</span></button>
        )}
        <button className="act red" onClick={() => onUpdate({ status: "disputed" }, stuff ? "Marked as lost or disputed" : "Marked as disputed")}><AlertTriangle size={17} /><span>{stuff ? "Mark lost" : "Mark disputed"}</span></button>
      </div>

      {!stuff && isOpen(item) && (() => {
        const pl = findPayerLink(item.owedBy);
        return (
          <button className="card feed-row" onClick={() => { try { window.open(pl.url, "_blank"); } catch (e) {} }}>
            <div className="feed-ic tone-info"><ExternalLink size={16} /></div>
            <div className="feed-body">
              <div className="feed-text">{pl.known ? `Check on this with ${pl.label}` : `Look up ${item.owedBy} status`}</div>
              <div className="feed-meta">{pl.known ? "Opens their app if it's on your phone, otherwise their site" : "Opens a search for their refund status page"}</div>
            </div>
            <ChevronRight size={16} className="feed-chev" />
          </button>
        );
      })()}

      {!stuff && PERSON_CATS.includes(item.category) && isOpen(item) && (
        <div className="card panel">
          <div className="panel-title">Get paid back</div>
          <div className="hint" style={{ marginTop: 0, marginBottom: 10 }}>
            Share a link and {item.owedBy} can send the {fmtMoney(rem || item.amount)} in a couple of taps.
          </div>
          {PAY_PLATFORMS.filter((p) => user.handles && user.handles[p.id]).map((p) => {
            const url = payLink(p.id, user.handles[p.id], rem || item.amount);
            return (
              <div className="pay-row" key={p.id}>
                <div className="pay-mid">
                  <div className="pay-name">{p.label}</div>
                  <div className="pay-url">{url}</div>
                </div>
                <button className="btn ghost sm pay-copy" onClick={() => copyPay(p.id, url)}>
                  {copiedPlat === p.id ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy</>}
                </button>
              </div>
            );
          })}
          {PAY_PLATFORMS.every((p) => !user.handles || !user.handles[p.id]) && (
            <div className="hint">Add your Venmo, Cash App, or PayPal handle in Settings to turn on pay-me links.</div>
          )}
        </div>
      )}

      {statusOpen && (
        <div className="card panel">
          <div className="panel-title">Set status</div>
          <div className="chip-row">
            {Object.entries(STATUSES)
              .filter(([k]) => (stuff ? k === "lent" || k === "disputed" : !["received", "partial", "lent", "returned"].includes(k)))
              .map(([k, s]) => (
              <button key={k} className={`chip ${item.status === k ? "on" : ""}`}
                onClick={() => { onUpdate({ status: k }, `Status changed to ${s.label}`); setStatusOpen(false); }}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="hint">{stuff ? "Use Mark returned when it comes back." : "Use Record payment to mark money as received."}</div>
        </div>
      )}

      {noteOpen && (
        <div className="card panel">
          <div className="panel-title">Add a note</div>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" />
          <div className="btn-row tight">
            <button className="btn ghost sm" onClick={() => setNoteOpen(false)}>Cancel</button>
            <button className="btn primary sm" disabled={!note.trim()} onClick={() => {
              onLog({ type: "note", text: "Note: " + note }, { notes: item.notes ? item.notes + "\n" + note : note });
              setNote(""); setNoteOpen(false);
            }}>Save note</button>
          </div>
        </div>
      )}

      <div className="card panel">
        <div className="panel-title">Details</div>
        {!stuff && (
          <>
            <div className="kv"><span>Amount expected</span><b>{fmtMoney(item.amount)}</b></div>
            <div className="kv"><span>Amount received</span><b className={item.received ? "text-green" : ""}>{fmtMoney(item.received)}</b></div>
            <div className="kv"><span>Remaining</span><b>{fmtMoney(rem)}</b></div>
          </>
        )}
        <div className="kv"><span>{stuff ? "Lent on" : "Submitted"}</span><b>{fmtDateLong(item.submittedDate)}</b></div>
        <div className="kv"><span>{stuff ? "Due back" : "Expected"}</span><b>{fmtDateLong(item.expectedDate)}</b></div>
        <div className="kv"><span>Category</span><b>{c.label}</b></div>
        {!stuff && <div className="kv"><span>Payment method</span><b>{item.method || "—"}</b></div>}
        {!stuff && <div className="kv"><span>Reference</span><b>{item.reference || "—"}</b></div>}
        {item.notes && <div className="notes">{item.notes}</div>}
      </div>

      {(item.docs || []).length > 0 && (
        <div className="card panel">
          <div className="panel-title">Documents</div>
          {item.docs.map((d) => (
            <div className="doc-row" key={d.id}>
              <Paperclip size={15} /><span className="doc-name">{d.name}</span>
              <span className="doc-meta">{d.type} · {fmtDate(d.date)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card panel">
        <div className="panel-title">Timeline</div>
        <div className="timeline">
          {timeline.map((a) => (
            <div className="t-row" key={a.id}>
              <div className={`t-dot t-${a.type}`} />
              <div className="t-body">
                <div className="t-text">{a.text}{a.amount ? <b className="text-green"> {fmtMoney(a.amount)}</b> : null}</div>
                <div className="t-date">{fmtDateLong(a.date)}</div>
              </div>
            </div>
          ))}
          <div className="t-row">
            <div className="t-dot t-created" />
            <div className="t-body">
              <div className="t-text">Item created</div>
              <div className="t-date">{fmtDateLong(item.submittedDate)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- follow-up sheet ---------------- */

function FollowUpSheet({ item, user, onClose, onSent }) {
  const isPerson = PERSON_CATS.includes(item.category);
  const withHandles = isStuff(item) ? [] : PAY_PLATFORMS.filter((p) => user.handles && user.handles[p.id]);
  const [tone, setTone] = useState(isPerson || isStuff(item) ? "Friendly" : "Professional");
  const [text, setText] = useState(draftFollowUp(item, isPerson || isStuff(item) ? "Friendly" : "Professional"));
  const [linkPlat, setLinkPlat] = useState(isPerson && withHandles[0] ? withHandles[0].id : "");
  const [copied, setCopied] = useState(false);
  const pick = (t) => { setTone(t); setText(draftFollowUp(item, t)); };
  const amt = remaining(item) || item.amount;
  const link = linkPlat ? payLink(linkPlat, user.handles[linkPlat], amt) : "";
  const finalText = link ? `${text}\n\nEasiest way to send it: ${link}` : text;
  const copy = () => {
    try { navigator.clipboard?.writeText(finalText); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const openSend = (kind) => {
    const enc = encodeURIComponent(finalText);
    const url = kind === "sms" ? `sms:?&body=${enc}` : `https://wa.me/?text=${enc}`;
    try { window.open(url, "_blank"); } catch (e) {}
  };
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-bar" />
        <div className="sheet-head">
          <h2 className="h2">Draft a follow-up</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="chip-row">
          {TONES.map((t) => (
            <button key={t} className={`chip ${tone === t ? "on" : ""}`} onClick={() => pick(t)}>{t}</button>
          ))}
        </div>
        <textarea className="msg" rows={7} value={text} onChange={(e) => setText(e.target.value)} />
        {withHandles.length > 0 && (
          <div>
            <div className="f-label" style={{ marginBottom: 6 }}>Attach your pay-me link</div>
            <div className="chip-row">
              <button className={`chip ${!linkPlat ? "on" : ""}`} onClick={() => setLinkPlat("")}>None</button>
              {withHandles.map((p) => (
                <button key={p.id} className={`chip ${linkPlat === p.id ? "on" : ""}`} onClick={() => setLinkPlat(p.id)}>{p.label}</button>
              ))}
            </div>
            {link && <div className="link-preview">{link}</div>}
          </div>
        )}
        <div className="send-grid">
          <button className="btn ghost sm" onClick={copy}>{copied ? <><Check size={15}/> Copied</> : <><Copy size={15}/> Copy</>}</button>
          <button className="btn ghost sm" onClick={() => openSend("sms")}><MessageSquare size={15}/> Text</button>
          <button className="btn ghost sm" onClick={() => openSend("wa")}><Send size={15}/> WhatsApp</button>
        </div>
        <button className="btn primary" onClick={() => onSent(tone, finalText)}><Check size={16}/> Mark as sent</button>
        <div className="hint center">Text and WhatsApp open your messaging app with this draft filled in. If this preview blocks it, Copy works everywhere. Saving adds the follow-up to the timeline.</div>
      </div>
    </div>
  );
}

/* ---------------- payment sheet + confirmation ---------------- */

function PaymentSheet({ item, onClose, onRecord }) {
  const rem = remaining(item);
  const [mode, setMode] = useState("full");
  const [amt, setAmt] = useState(String(rem));
  const [date, setDate] = useState(iso(today()));
  const [method, setMethod] = useState(item.method || "");
  const [notes, setNotes] = useState("");
  const val = mode === "full" ? rem : Math.min(rem, +amt || 0);
  const after = +(rem - val).toFixed(2);

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-bar" />
        <div className="sheet-head">
          <h2 className="h2">Record payment</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="seg">
          <button className={mode === "full" ? "on" : ""} onClick={() => { setMode("full"); setAmt(String(rem)); }}>Full · {fmtMoney(rem)}</button>
          <button className={mode === "partial" ? "on" : ""} onClick={() => setMode("partial")}>Partial</button>
        </div>
        {mode === "partial" && (
          <label className="f-label">Amount received
            <div className="amt-wrap"><span>$</span>
              <input type="number" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} />
            </div>
            <div className="hint">{after > 0 ? `${fmtMoney(after)} will remain outstanding.` : "This covers the full remaining balance."}</div>
          </label>
        )}
        <label className="f-label">Payment date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="f-label">Payment method
          <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Direct deposit, Venmo…" />
        </label>
        <label className="f-label">Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </label>
        <div className="btn-row">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={val <= 0} onClick={() => onRecord(val, date, method, notes)}>
            Record {fmtMoney(val)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Recovered({ amount, lifetime, stuff, label, onDone }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div className="recovered">
      <Ring pct={go ? 1 : 0} size={128} stroke={8} color="var(--green-bright)" track="rgba(255,255,255,.16)" animate>
        <CheckCircle2 size={44} color="var(--green-bright)" style={{ opacity: go ? 1 : 0, transition: "opacity .5s .7s" }} />
      </Ring>
      {stuff ? (
        <>
          <div className="rec-amt rec-thing">{label} is back</div>
          <div className="rec-sub">Marked as returned. One less thing floating around.</div>
        </>
      ) : (
        <>
          <div className="rec-amt">{fmtMoney(amount)} recovered</div>
          <div className="rec-sub">The loop is closed on this one.</div>
          <div className="rec-life">
            <span>Lifetime recovered</span>
            <b>{fmtMoney(lifetime)}</b>
          </div>
        </>
      )}
      <button className="btn light" onClick={onDone}>Done</button>
    </div>
  );
}

/* ---------------- activity page ---------------- */

const ACT_META = {
  created:  { label: "Items created",   Icon: PlusCircle },
  status:   { label: "Status changes",  Icon: PenLine },
  followup: { label: "Follow-ups",      Icon: Send },
  payment:  { label: "Payments",        Icon: ArrowDownLeft },
  document: { label: "Documents",       Icon: Paperclip },
  note:     { label: "Notes",           Icon: FileText },
  closed:   { label: "Items closed",    Icon: CheckCircle2 },
};

function ActivityPage({ activities, items, openItem }) {
  const [filter, setFilter] = useState("all");
  const list = activities
    .filter((a) => filter === "all" || a.type === filter)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="page">
      <h1 className="h1 pad-h">Activity</h1>
      <div className="chip-row pad-h scroll-x">
        <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All</button>
        {Object.entries(ACT_META).map(([k, m]) => (
          <button key={k} className={`chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{m.label}</button>
        ))}
      </div>
      <div className="stack">
        {list.map((a) => {
          const M = ACT_META[a.type] || ACT_META.status;
          const it = items.find((i) => i.id === a.itemId);
          return (
            <button className="card feed-row" key={a.id} onClick={() => it && openItem(it.id)}>
              <div className={`feed-ic feed-${a.type}`}><M.Icon size={16} /></div>
              <div className="feed-body">
                <div className="feed-text">{a.text}{a.amount ? <b className="text-green"> · {fmtMoney(a.amount)}</b> : null}</div>
                <div className="feed-meta">{it ? it.owedBy + " · " : ""}{fmtDateLong(a.date)}</div>
              </div>
              <ChevronRight size={16} className="feed-chev" />
            </button>
          );
        })}
        {list.length === 0 && <div className="empty small">No activity of this type yet.</div>}
      </div>
    </div>
  );
}

/* ---------------- notifications ---------------- */

function NotificationsPanel({ onClose }) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-bar" />
        <div className="sheet-head">
          <h2 className="h2">Notifications</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="stack">
          {seedNotifications.map((n) => (
            <div className="notif" key={n.id}>
              <div className={`feed-ic tone-${n.tone}`}><n.Icon size={16} /></div>
              <div className="feed-body">
                <div className="notif-title">{n.title}</div>
                <div className="notif-body">{n.body}</div>
              </div>
              <div className="notif-time">{n.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- settings ---------------- */

function SettingsPage({ user, setUser }) {
  const [toast, setToast] = useState("");
  const ping = (m) => { setToast(m); setTimeout(() => setToast(""), 1800); };
  const rows = [
    { Icon: Bell, label: "Notification preferences", sub: "Push and email alerts", act: () => ping("Notification settings would open here.") },
    { Icon: Clock, label: "Default reminder timing", sub: "3 days before expected date", act: () => ping("Reminder timing would open here.") },
    { Icon: DollarSign, label: "Currency", sub: "USD ($)", act: () => ping("Currency options would open here.") },
    { Icon: ListChecks, label: "Categories", sub: "10 categories", act: () => ping("Category editor would open here.") },
    { Icon: Download, label: "Export your data", sub: "CSV of all items and activity", act: () => ping("Your export is being prepared.") },
    { Icon: Lock, label: "Privacy and security", sub: "Passcode, data controls", act: () => ping("Privacy settings would open here.") },
    { Icon: Star, label: "Subscription", sub: "Owed Plus · free trial", act: () => ping("Subscription details would open here.") },
    { Icon: HelpCircle, label: "Help and feedback", sub: "Guides and contact", act: () => ping("Help center would open here.") },
  ];
  return (
    <div className="page">
      <h1 className="h1 pad-h">Settings</h1>
      <div className="card profile">
        <div className="avatar lg">{user.name[0]}</div>
        <div>
          <div className="p-name">{user.name}</div>
          <div className="p-mail">{user.email}</div>
        </div>
      </div>
      <div className="card recovered-card">
        <div>
          <div className="rc-l">Owed has helped you recover</div>
          <div className="rc-v">{fmtMoney(user.recovered)}</div>
        </div>
        <CheckCircle2 size={26} />
      </div>
      <div className="card panel">
        <div className="panel-title">Payment handles</div>
        <div className="hint" style={{ marginTop: 0, marginBottom: 10 }}>
          Used to build your pay-me links when a person owes you money.
        </div>
        {PAY_PLATFORMS.map((p) => (
          <label className="f-label" key={p.id} style={{ marginBottom: 10 }}>
            {p.label}
            <input
              placeholder={p.id === "cashapp" ? "$yourcashtag" : p.id === "venmo" ? "your-venmo-username" : "yourpaypalme"}
              value={(user.handles && user.handles[p.id]) || ""}
              onChange={(e) => setUser({ ...user, handles: { ...user.handles, [p.id]: e.target.value } })}
            />
          </label>
        ))}
      </div>
      <div className="card settings-list">
        {rows.map((r, i) => (
          <button className="set-row" key={i} onClick={r.act}>
            <r.Icon size={18} />
            <div className="set-mid">
              <div>{r.label}</div>
              <div className="set-sub">{r.sub}</div>
            </div>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      <div className="hint center">Owed 1.0 · Prototype</div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ---------------- auth + onboarding ---------------- */

function Wordmark({ size = 44, light }) {
  return (
    <div className="wordmark" style={{ fontSize: size }}>
      <span className="wm-o" style={{ borderColor: light ? "rgba(255,255,255,.9)" : "var(--brand)" }} />wed
    </div>
  );
}

function Auth({ onEnter }) {
  const [screen, setScreen] = useState("welcome"); // welcome | signup | login | forgot
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (screen === "welcome") return (
    <div className="auth">
      <div className="auth-hero">
        <Wordmark size={56} light />
        <p className="auth-tag">Track what is coming back to you.</p>
        <p className="auth-sub">Reimbursements, refunds, credits, and IOUs, all in one calm place, until every dollar lands.</p>
      </div>
      <div className="auth-actions">
        <button className="btn light block" onClick={() => setScreen("signup")}>Create account</button>
        <button className="btn ghost-light block" onClick={() => setScreen("login")}>Log in</button>
      </div>
    </div>
  );

  const back = <button className="icon-btn" onClick={() => setScreen("welcome")}><ChevronLeft size={20} /></button>;

  if (screen === "signup") return (
    <div className="auth form-mode">
      <div className="detail-top">{back}</div>
      <Wordmark size={36} />
      <h1 className="h1">Create your account</h1>
      <div className="form card">
        <label className="f-label">Name<input value={f.name} onChange={set("name")} placeholder="Your name" /></label>
        <label className="f-label">Email<input type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" /></label>
        <label className="f-label">Password<input type="password" value={f.pw} onChange={set("pw")} placeholder="8+ characters" /></label>
      </div>
      <button className="btn primary block" disabled={!f.name || !f.email || f.pw.length < 8}
        onClick={() => onEnter(f.name, f.email, true)}>Continue</button>
    </div>
  );

  if (screen === "login") return (
    <div className="auth form-mode">
      <div className="detail-top">{back}</div>
      <Wordmark size={36} />
      <h1 className="h1">Welcome back</h1>
      <div className="form card">
        <label className="f-label">Email<input type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" /></label>
        <label className="f-label">Password<input type="password" value={f.pw} onChange={set("pw")} /></label>
      </div>
      <button className="btn primary block" disabled={!f.email || !f.pw}
        onClick={() => onEnter("Jordan Reyes", f.email, false)}>Log in</button>
      <button className="link center" onClick={() => setScreen("forgot")}>Forgot password?</button>
    </div>
  );

  return (
    <div className="auth form-mode">
      <div className="detail-top">{back}</div>
      <Wordmark size={36} />
      <h1 className="h1">Reset your password</h1>
      <p className="lede">Enter your email and we'll send a reset link.</p>
      <div className="form card">
        <label className="f-label">Email<input type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" /></label>
      </div>
      <button className="btn primary block" disabled={!f.email} onClick={() => setScreen("login")}>Send reset link</button>
    </div>
  );
}

const OB_STEPS = [
  { q: "What kinds of money do you usually wait for?", multi: true,
    opts: ["Work reimbursements", "Refunds", "Card credits", "Insurance", "Friends & family", "Deposits"] },
  { q: "How often do you submit reimbursements or refunds?", multi: false,
    opts: ["Weekly", "A few times a month", "Monthly", "Occasionally"] },
  { q: "When should Owed remind you to follow up?", multi: false,
    opts: ["On the expected date", "3 days before", "1 week before", "Only when overdue"] },
];

function Onboarding({ name, onDone }) {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState([[], [], []]);
  const done = step >= OB_STEPS.length;
  const s = done ? null : OB_STEPS[step];
  const toggle = (o) => {
    const cur = sel[step] || [];
    const next = s.multi ? (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]) : [o];
    const all = sel.slice(); all[step] = next; setSel(all);
  };
  const canNext = !done && (sel[step] || []).length > 0;

  if (done) return (
    <div className="auth form-mode ob">
      <Wordmark size={36} />
      <h1 className="h1">You're set, {name.split(" ")[0]}.</h1>
      <p className="lede">Want to add the first thing you're waiting on? It takes about 30 seconds.</p>
      <button className="btn primary block" onClick={() => onDone(true)}>Add my first owed item</button>
      <button className="btn ghost block" onClick={() => onDone(false)}>Explore with sample data</button>
    </div>
  );

  return (
    <div className="auth form-mode ob">
      <div className="ob-progress">
        {[0,1,2].map((i) => <div key={i} className={`ob-seg ${i <= step ? "on" : ""}`} />)}
      </div>
      <h1 className="h1">{s.q}</h1>
      {s.multi && <p className="hint">Pick as many as apply.</p>}
      <div className="chip-row wrap">
        {s.opts.map((o) => (
          <button key={o} className={`chip lg ${sel[step].includes(o) ? "on" : ""}`} onClick={() => toggle(o)}>{o}</button>
        ))}
      </div>
      <button className="btn primary block" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</button>
      {step > 0 && <button className="link center" onClick={() => setStep(step - 1)}>Back</button>}
    </div>
  );
}

/* ---------------- root app ---------------- */

export default function OwedApp() {
  const [phase, setPhase] = useState("auth"); // auth | onboarding | app
  const [user, setUser] = useState({
    name: "Jordan Reyes", email: "jordan@example.com", recovered: 120,
    handles: { venmo: "jordan-reyes", cashapp: "jordanreyes", paypal: "" },
  });
  const [items, setItems] = useState(seedItems);
  const [activities, setActivities] = useState(seedActivities);
  const [tab, setTab] = useState("dash");
  const [itemsTab, setItemsTab] = useState("Active");
  const [detailId, setDetailId] = useState(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [recovered, setRecovered] = useState(null); // {amount}

  const item = items.find((i) => i.id === detailId);

  const log = (itemId, entry) =>
    setActivities((a) => [{ id: nid(), itemId, date: iso(today()), ...entry }, ...a]);

  const updateItem = (id, patch) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const go = (t, itemsTabName) => {
    setDetailId(null);
    if (itemsTabName) setItemsTab(itemsTabName);
    setTab(t);
  };

  const saveNew = (f) => {
    const stuffKind = f.kind === "stuff";
    const it = {
      id: nid(), kind: f.kind || "money", owedBy: f.owedBy.trim(), description: f.description.trim(), category: f.category,
      amount: stuffKind ? 0 : +f.amount, received: 0, status: stuffKind ? "lent" : "submitted",
      submittedDate: f.submittedDate, expectedDate: f.expectedDate,
      method: f.method, reference: f.reference, notes: f.notes,
      reminderDate: f.reminderDate, recurring: f.recurring,
      docs: f.doc ? [{ id: nid(), name: f.doc, type: stuffKind ? "Image" : "PDF", date: iso(today()) }] : [],
    };
    setItems((l) => [it, ...l]);
    log(it.id, { type: "created", text: stuffKind ? `${it.description} lent to ${it.owedBy}` : `${it.description} added` });
    setDetailId(it.id); setTab("items");
  };

  const markReturned = () => {
    updateItem(item.id, { status: "returned", receivedDate: iso(today()) });
    log(item.id, { type: "closed", text: `${item.description} returned by ${item.owedBy}` });
    setRecovered({ stuff: true, label: item.description });
  };

  const recordPayment = (amt, date, method, notes) => {
    const rec = +(item.received + amt).toFixed(2);
    const full = rec >= item.amount - 0.001;
    updateItem(item.id, {
      received: full ? item.amount : rec,
      status: full ? "received" : "partial",
      receivedDate: full ? date : item.receivedDate,
      method: method || item.method,
    });
    log(item.id, { type: "payment", text: full ? `Payment received from ${item.owedBy}` : `Partial payment received from ${item.owedBy}`, amount: amt });
    if (full) log(item.id, { type: "closed", text: `${item.description} closed` });
    setUser((u) => ({ ...u, recovered: +(u.recovered + amt).toFixed(2) }));
    setShowPayment(false);
    if (full) setRecovered({ amount: item.amount });
  };

  if (phase === "auth")
    return <Shell><Auth onEnter={(name, email, isNew) => {
      setUser((u) => ({ ...u, name: name || u.name, email: email || u.email }));
      setPhase(isNew ? "onboarding" : "app");
    }} /></Shell>;

  if (phase === "onboarding")
    return <Shell><Onboarding name={user.name} onDone={(addFirst) => { setPhase("app"); setTab(addFirst ? "add" : "dash"); }} /></Shell>;

  return (
    <Shell>
      <div className="app-scroll">
        {item ? (
          <ItemDetail
            item={item} user={user} activities={activities}
            onBack={() => setDetailId(null)}
            onDelete={() => { setItems((l) => l.filter((i) => i.id !== item.id)); setDetailId(null); }}
            onUpdate={(patch, text) => { updateItem(item.id, patch); log(item.id, { type: "status", text }); }}
            onLog={(entry, patch) => { if (patch) updateItem(item.id, patch); log(item.id, entry); }}
            onFollowUp={() => setShowFollowUp(true)}
            onPayment={() => setShowPayment(true)}
            onReturned={markReturned}
          />
        ) : (
          <>
            {tab === "dash" && <Dashboard items={items} user={user} go={go} openItem={setDetailId} openNotifs={() => setShowNotifs(true)} />}
            {tab === "items" && <ItemsPage key={itemsTab} items={items} initialTab={itemsTab} openItem={setDetailId} />}
            {tab === "add" && <AddItem onSave={saveNew} onCancel={() => setTab("dash")} />}
            {tab === "activity" && <ActivityPage activities={activities} items={items} openItem={setDetailId} />}
            {tab === "settings" && <SettingsPage user={user} setUser={setUser} />}
          </>
        )}
      </div>

      <nav className="bottom-nav">
        {[
          { id: "dash", Icon: Home, label: "Home" },
          { id: "items", Icon: ListChecks, label: "Items" },
          { id: "add", Icon: PlusCircle, label: "Add", big: true },
          { id: "activity", Icon: Activity, label: "Activity" },
          { id: "settings", Icon: SettingsIcon, label: "Settings" },
        ].map((n) => (
          <button key={n.id} className={`nav-btn ${tab === n.id && !item ? "on" : ""} ${n.big ? "big" : ""}`} onClick={() => go(n.id)}>
            <n.Icon size={n.big ? 26 : 21} strokeWidth={tab === n.id && !item ? 2.2 : 1.8} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {showFollowUp && item && (
        <FollowUpSheet item={item} user={user} onClose={() => setShowFollowUp(false)}
          onSent={(tone, text) => { log(item.id, { type: "followup", text: `${tone} follow-up sent to ${item.owedBy}` }); setShowFollowUp(false); }} />
      )}
      {showPayment && item && (
        <PaymentSheet item={item} onClose={() => setShowPayment(false)} onRecord={recordPayment} />
      )}
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      {recovered && <Recovered amount={recovered.amount} lifetime={user.recovered} stuff={recovered.stuff} label={recovered.label} onDone={() => { setRecovered(null); setDetailId(null); setTab("dash"); }} />}
    </Shell>
  );
}

/* ---------------- shell + styles ---------------- */

function Shell({ children }) {
  return (
    <div className="owed-root">
      <style>{CSS}</style>
      <div className="frame">{children}</div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');

.owed-root {
  --bg:#F4F6F2; --surface:#FFFFFF; --ink:#1E2A27; --muted:#6B7772; --line:#E3E8E1;
  --brand:#284B44; --brand-deep:#1C3833;
  --green:#2E7D5B; --green-bright:#5FD3A0; --green-soft:#E7F3EC;
  --amber:#9A6E12; --amber-soft:#F7EEDA;
  --red:#AC4238; --red-soft:#F8E9E6;
  --info:#3E5E8C; --info-soft:#E9EEF6;
  --r:18px; --shadow:0 1px 2px rgba(30,42,39,.05), 0 8px 24px rgba(30,42,39,.06);
  min-height:100vh; background:linear-gradient(180deg,#EAEEE7,#F4F6F2 240px);
  display:flex; justify-content:center; padding:0;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  color:var(--ink); -webkit-font-smoothing:antialiased;
}
.owed-root *{box-sizing:border-box; font-family:inherit;}
.frame{width:100%; max-width:460px; min-height:100vh; background:var(--bg); position:relative; display:flex; flex-direction:column; box-shadow:0 0 0 1px var(--line), 0 20px 60px rgba(30,42,39,.10);}
@media (max-width:480px){ .frame{box-shadow:none;} }

.app-scroll{flex:1; overflow-y:auto; padding-bottom:96px;}
.page{padding:20px 18px 28px; display:flex; flex-direction:column; gap:16px;}
.pad-h{padding:0;}

h1,h2,h3{margin:0;}
.h1{font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:26px; letter-spacing:-.01em;}
.h2{font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:18px;}
.eyebrow{font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);}
.lede{color:var(--muted); font-size:14.5px; line-height:1.5; margin:0;}
.hint{font-size:12.5px; color:var(--muted); margin-top:6px;}
.hint.center{text-align:center;}
.link{background:none; border:none; color:var(--brand); font-weight:600; font-size:13.5px; cursor:pointer; padding:4px 0; display:inline-flex; align-items:center; gap:4px;}
.link.center{align-self:center;}

.text-green{color:var(--green);} .text-red{color:var(--red);}
.text-green-soft{color:var(--green-bright);} .text-red-soft{color:#F2B3AB;}

.card{background:var(--surface); border:1px solid var(--line); border-radius:var(--r); box-shadow:var(--shadow);}

/* dashboard */
.dash-head{display:flex; justify-content:space-between; align-items:flex-start; gap:12px;}
.head-actions{display:flex; align-items:center; gap:10px;}
.icon-btn{position:relative; width:40px; height:40px; border-radius:14px; border:1px solid var(--line); background:var(--surface); color:var(--ink); display:flex; align-items:center; justify-content:center; cursor:pointer;}
.icon-btn.on{background:var(--brand); color:#fff; border-color:var(--brand);}
.icon-btn.danger{color:var(--red);}
.icon-btn .dot{position:absolute; top:9px; right:10px; width:7px; height:7px; border-radius:50%; background:var(--red); border:1.5px solid var(--surface);}
.avatar{width:40px; height:40px; border-radius:14px; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px;}
.avatar.lg{width:52px; height:52px; border-radius:16px; font-size:20px;}

.hero{background:linear-gradient(150deg,var(--brand),var(--brand-deep)); color:#fff; border:none; padding:20px; border-radius:22px;}
.hero-top{display:flex; justify-content:space-between; align-items:center; gap:12px;}
.hero-label{font-size:13px; opacity:.85; font-weight:500;}
.hero-amt{font-family:'Fraunces',Georgia,serif; font-size:40px; font-weight:600; letter-spacing:-.02em; line-height:1.1; margin-top:4px; font-variant-numeric:tabular-nums;}
.hero-sub{font-size:12.5px; opacity:.7; margin-top:4px;}
.ring-lbl{text-align:center; color:#fff;}
.ring-pct{font-weight:700; font-size:16px; font-variant-numeric:tabular-nums;}
.ring-cap{font-size:10px; opacity:.75; text-transform:uppercase; letter-spacing:.06em;}
.hero-stats{display:flex; margin-top:18px; padding-top:14px; border-top:1px solid rgba(255,255,255,.16);}
.hstat{flex:1; text-align:center;}
.hstat + .hstat{border-left:1px solid rgba(255,255,255,.16);}
.hstat-v{font-weight:700; font-size:15px; font-variant-numeric:tabular-nums;}
.hstat-l{font-size:11px; opacity:.7; margin-top:2px;}

.quick-row{display:flex; gap:10px;}
.quick{flex:1; background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:12px 8px; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; color:var(--brand); box-shadow:var(--shadow); transition:transform .12s;}
.quick:active{transform:scale(.97);}
.quick span{font-size:11.5px; font-weight:600; color:var(--ink); text-align:center; line-height:1.25;}

.sec-head{display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2px;}
.stack{display:flex; flex-direction:column; gap:10px;}

/* item card */
.item-card{display:flex; gap:12px; padding:14px; text-align:left; cursor:pointer; align-items:flex-start; width:100%; transition:transform .12s;}
.item-card:active{transform:scale(.985);}
.cat-badge{width:40px; height:40px; border-radius:13px; background:var(--green-soft); color:var(--brand); display:flex; align-items:center; justify-content:center; flex-shrink:0;}
.cat-badge.cat-red{background:var(--red-soft); color:var(--red);}
.cat-badge.lg{width:52px; height:52px; border-radius:16px; margin:0 auto;}
.item-mid{flex:1; min-width:0;}
.item-who{font-weight:600; font-size:14.5px;}
.item-desc{font-size:13px; color:var(--muted); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.item-when{font-size:12px; color:var(--muted); margin-top:5px; font-weight:500;}
.item-right{text-align:right; display:flex; flex-direction:column; align-items:flex-end;}
.item-amt{font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:17px; font-variant-numeric:tabular-nums;}
.item-sub{font-size:11px; color:var(--muted); margin-bottom:3px;}
.pill{display:inline-block; font-size:10.5px; font-weight:600; padding:3px 8px; border-radius:99px; margin-top:5px; letter-spacing:.01em;}
.pill-neutral{background:#EEF1EC; color:var(--muted);}
.pill-info{background:var(--info-soft); color:var(--info);}
.pill-green{background:var(--green-soft); color:var(--green);}
.pill-amber{background:var(--amber-soft); color:var(--amber);}
.pill-red{background:var(--red-soft); color:var(--red);}

/* items page */
.tabs{display:flex; background:#E9EDE6; border-radius:14px; padding:4px; gap:2px;}
.tab{flex:1; border:none; background:transparent; padding:9px 0; border-radius:11px; font-weight:600; font-size:13px; color:var(--muted); cursor:pointer;}
.tab.on{background:var(--surface); color:var(--ink); box-shadow:var(--shadow);}
.search-row{display:flex; gap:10px;}
.search{flex:1; display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:0 12px; color:var(--muted);}
.search input{flex:1; border:none; outline:none; padding:11px 0; font-size:14px; background:transparent; color:var(--ink);}
.filter-panel{padding:14px; display:flex; flex-direction:column; gap:12px;}

/* forms */
.form{padding:16px; display:flex; flex-direction:column; gap:14px;}
.f-label{display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:600; color:var(--ink);}
.req{font-weight:500; color:var(--muted); font-size:11px; margin-left:4px;}
.f-label input, .f-label select, .f-label textarea, .msg{border:1px solid var(--line); border-radius:12px; padding:11px 12px; font-size:15px; background:#FBFCFA; color:var(--ink); outline:none; width:100%; resize:vertical;}
.f-label input:focus, .f-label select:focus, .f-label textarea:focus, .msg:focus{border-color:var(--brand); background:#fff; box-shadow:0 0 0 3px rgba(40,75,68,.10);}
.amt-wrap{display:flex; align-items:center; gap:6px; border:1px solid var(--line); border-radius:12px; padding:0 12px; background:#FBFCFA;}
.amt-wrap:focus-within{border-color:var(--brand); background:#fff; box-shadow:0 0 0 3px rgba(40,75,68,.10);}
.amt-wrap span{font-weight:600; color:var(--muted);}
.amt-wrap input{border:none; background:transparent; flex:1; padding:11px 0; font-size:16px; outline:none; font-variant-numeric:tabular-nums;}
.cat-grid{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
.cat-chip{display:flex; align-items:center; gap:8px; border:1px solid var(--line); background:#FBFCFA; border-radius:12px; padding:9px 10px; font-size:12.5px; font-weight:500; color:var(--ink); cursor:pointer; text-align:left;}
.cat-chip.on{border-color:var(--brand); background:var(--green-soft); color:var(--brand); font-weight:600;}
.disclosure{align-self:flex-start;}
.more{display:flex; flex-direction:column; gap:14px; border-top:1px dashed var(--line); padding-top:14px;}
.upload{display:flex; align-items:center; gap:8px; border:1.5px dashed var(--line); border-radius:12px; padding:12px; color:var(--muted); font-weight:500; cursor:pointer; font-size:13.5px;}
.f-check{display:flex; gap:10px; align-items:center; font-size:13.5px; font-weight:500; cursor:pointer;}
.f-check input{width:18px; height:18px; accent-color:var(--brand);}

.btn-row{display:flex; gap:10px;}
.btn-row.tight{margin-top:10px;}
.btn{flex:1; border:none; border-radius:14px; padding:14px; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:transform .12s, opacity .15s;}
.btn:active{transform:scale(.98);}
.btn:disabled{opacity:.45; cursor:default;}
.btn.sm{padding:10px; font-size:13.5px; border-radius:11px;}
.btn.primary{background:var(--brand); color:#fff;}
.btn.ghost{background:transparent; border:1px solid var(--line); color:var(--ink);}
.btn.light{background:#fff; color:var(--brand-deep);}
.btn.ghost-light{background:transparent; border:1px solid rgba(255,255,255,.4); color:#fff;}
.btn.block{width:100%; flex:none;}

/* detail */
.detail-top{display:flex; justify-content:space-between;}
.detail-hero{text-align:center; padding:4px 0 2px;}
.detail-amt{font-family:'Fraunces',Georgia,serif; font-size:38px; font-weight:600; margin-top:12px; font-variant-numeric:tabular-nums; letter-spacing:-.02em;}
.detail-desc{font-weight:600; font-size:15px; margin-top:4px;}
.detail-who{color:var(--muted); font-size:13px; margin-top:2px;}
.detail-pills{display:flex; gap:6px; justify-content:center; margin-top:8px;}
.partial-bar{position:relative; height:30px; background:#E9EDE6; border-radius:99px; margin-top:14px; overflow:hidden; display:flex; align-items:center; justify-content:center;}
.partial-fill{position:absolute; left:0; top:0; bottom:0; background:var(--green-soft); border-right:2px solid var(--green);}
.partial-bar span{position:relative; font-size:11.5px; font-weight:600; color:var(--ink);}

.action-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:8px;}
.act{display:flex; flex-direction:column; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px 4px; cursor:pointer; color:var(--brand); box-shadow:var(--shadow);}
.act span{font-size:11px; font-weight:600; color:var(--ink);}
.act.green{color:var(--green);} .act.red{color:var(--red);}

.panel{padding:16px;}
.panel-title{font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:16px; margin-bottom:12px;}
.kv{display:flex; justify-content:space-between; padding:8px 0; font-size:13.5px; border-bottom:1px solid #F0F3EE;}
.kv:last-of-type{border-bottom:none;}
.kv span{color:var(--muted);}
.kv b{font-weight:600; font-variant-numeric:tabular-nums;}
.notes{margin-top:10px; background:#F7F9F5; border-radius:12px; padding:12px; font-size:13px; color:var(--ink); line-height:1.5; white-space:pre-wrap;}
.doc-row{display:flex; align-items:center; gap:8px; padding:8px 0; font-size:13.5px; color:var(--ink); border-bottom:1px solid #F0F3EE;}
.doc-row:last-child{border-bottom:none;}
.doc-name{font-weight:500; flex:1;}
.doc-meta{color:var(--muted); font-size:12px;}

.timeline{display:flex; flex-direction:column;}
.t-row{display:flex; gap:12px; position:relative; padding-bottom:16px;}
.t-row:not(:last-child)::before{content:""; position:absolute; left:5px; top:16px; bottom:-2px; width:2px; background:#E9EDE6;}
.t-row:last-child{padding-bottom:0;}
.t-dot{width:12px; height:12px; border-radius:50%; margin-top:3px; flex-shrink:0; background:var(--muted);}
.t-payment{background:var(--green);} .t-status{background:var(--info);} .t-followup{background:var(--amber);}
.t-created{background:var(--brand);} .t-document{background:var(--muted);} .t-note{background:var(--muted);} .t-closed{background:var(--green);}
.t-text{font-size:13.5px; font-weight:500;}
.t-date{font-size:11.5px; color:var(--muted); margin-top:1px;}

.chip-row{display:flex; gap:8px; flex-wrap:wrap;}
.chip-row.scroll-x{flex-wrap:nowrap; overflow-x:auto; padding-bottom:4px; scrollbar-width:none;}
.chip-row.scroll-x::-webkit-scrollbar{display:none;}
.chip{border:1px solid var(--line); background:var(--surface); border-radius:99px; padding:8px 14px; font-size:12.5px; font-weight:600; color:var(--ink); cursor:pointer; white-space:nowrap;}
.chip.on{background:var(--brand); border-color:var(--brand); color:#fff;}
.chip.lg{padding:12px 16px; font-size:14px;}

/* sheets */
.sheet-back{position:fixed; inset:0; background:rgba(20,30,27,.45); display:flex; align-items:flex-end; justify-content:center; z-index:50; animation:fade .2s;}
.sheet{width:100%; max-width:460px; background:var(--bg); border-radius:24px 24px 0 0; padding:10px 18px 26px; max-height:86vh; overflow-y:auto; display:flex; flex-direction:column; gap:14px; animation:up .25s cubic-bezier(.22,1,.36,1);}
.sheet-bar{width:40px; height:4px; border-radius:99px; background:#D5DBD2; margin:0 auto;}
.sheet-head{display:flex; justify-content:space-between; align-items:center;}
.msg{font-size:14px; line-height:1.55; background:var(--surface);}
.seg{display:flex; background:#E9EDE6; border-radius:13px; padding:4px; gap:2px;}
.seg button{flex:1; border:none; background:transparent; padding:10px; border-radius:10px; font-weight:600; font-size:13.5px; color:var(--muted); cursor:pointer;}
.seg button.on{background:var(--surface); color:var(--ink); box-shadow:var(--shadow);}
@keyframes fade{from{opacity:0;}} @keyframes up{from{transform:translateY(40px); opacity:.6;}}
@media (prefers-reduced-motion: reduce){ *{animation:none !important; transition:none !important;} }

/* recovered */
.recovered{position:fixed; inset:0; z-index:60; background:linear-gradient(160deg,var(--brand),var(--brand-deep)); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:32px; text-align:center; animation:fade .3s;}
.rec-amt{font-family:'Fraunces',Georgia,serif; font-size:36px; font-weight:600; margin-top:16px; font-variant-numeric:tabular-nums;}
.rec-sub{opacity:.8; font-size:14px;}
.rec-life{display:flex; flex-direction:column; gap:2px; margin:22px 0 26px; background:rgba(255,255,255,.10); border-radius:16px; padding:14px 26px;}
.rec-life span{font-size:12px; opacity:.75;}
.rec-life b{font-size:20px; font-variant-numeric:tabular-nums;}
.recovered .btn{flex:none; min-width:180px;}

/* activity feed */
.feed-row{display:flex; gap:12px; padding:13px 14px; align-items:center; text-align:left; cursor:pointer; width:100%;}
.feed-ic{width:34px; height:34px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#EEF1EC; color:var(--muted);}
.feed-payment,.tone-green{background:var(--green-soft); color:var(--green);}
.feed-status,.tone-info{background:var(--info-soft); color:var(--info);}
.feed-followup,.tone-amber{background:var(--amber-soft); color:var(--amber);}
.feed-created{background:var(--green-soft); color:var(--brand);}
.feed-closed{background:var(--green-soft); color:var(--green);}
.tone-red{background:var(--red-soft); color:var(--red);}
.tone-neutral{background:#EEF1EC; color:var(--muted);}
.feed-body{flex:1; min-width:0;}
.feed-text{font-size:13.5px; font-weight:500;}
.feed-meta{font-size:11.5px; color:var(--muted); margin-top:2px;}
.feed-chev{color:var(--muted); flex-shrink:0;}

.notif{display:flex; gap:12px; padding:13px 14px; background:var(--surface); border:1px solid var(--line); border-radius:16px; align-items:flex-start;}
.notif-title{font-weight:600; font-size:13.5px;}
.notif-body{font-size:12.5px; color:var(--muted); margin-top:2px; line-height:1.45;}
.notif-time{font-size:11px; color:var(--muted); flex-shrink:0;}

/* settings */
.profile{display:flex; gap:14px; align-items:center; padding:16px;}
.p-name{font-weight:700; font-size:16px;}
.p-mail{font-size:13px; color:var(--muted);}
.recovered-card{background:var(--green-soft); border-color:#D4E8DC; display:flex; justify-content:space-between; align-items:center; padding:16px; color:var(--green);}
.rc-l{font-size:12.5px; font-weight:600; color:var(--green);}
.rc-v{font-family:'Fraunces',Georgia,serif; font-size:26px; font-weight:600; color:var(--brand-deep); margin-top:2px; font-variant-numeric:tabular-nums;}
.settings-list{padding:4px 0;}
.set-row{display:flex; align-items:center; gap:14px; width:100%; padding:14px 16px; background:none; border:none; cursor:pointer; color:var(--ink); text-align:left; border-bottom:1px solid #F0F3EE; font-size:14px; font-weight:500;}
.set-row:last-child{border-bottom:none;}
.set-row > svg:first-child{color:var(--brand); flex-shrink:0;}
.set-mid{flex:1;}
.set-sub{font-size:12px; color:var(--muted); margin-top:1px; font-weight:400;}
.toast{position:fixed; bottom:104px; left:50%; transform:translateX(-50%); background:var(--ink); color:#fff; padding:10px 18px; border-radius:99px; font-size:13px; font-weight:500; z-index:70; animation:fade .2s; white-space:nowrap;}

/* nav */
.bottom-nav{position:absolute; bottom:0; left:0; right:0; background:rgba(255,255,255,.92); backdrop-filter:blur(12px); border-top:1px solid var(--line); display:flex; padding:8px 6px calc(10px + env(safe-area-inset-bottom));}
.nav-btn{flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; background:none; border:none; color:var(--muted); font-size:10.5px; font-weight:600; cursor:pointer; padding:4px 0;}
.nav-btn.on{color:var(--brand);}
.nav-btn.big{color:var(--brand);}
.nav-btn:focus-visible, .btn:focus-visible, .chip:focus-visible, .icon-btn:focus-visible{outline:2px solid var(--brand); outline-offset:2px; border-radius:12px;}

/* empty states */
.empty{text-align:center; padding:36px 20px; color:var(--muted); font-size:13.5px; line-height:1.5; background:var(--surface); border:1px dashed var(--line); border-radius:var(--r);}
.empty p{margin:4px 0;}
.empty strong{color:var(--ink);}
.empty.small{padding:22px;}
.empty-ring{width:56px; height:56px; margin:0 auto 10px; border-radius:50%; background:#F0F3EE; display:flex; align-items:center; justify-content:center; color:var(--muted);}

/* scan + pay links */
.scan-zone{padding:32px 22px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px; border-style:dashed;}
.scan-zone p{margin:0; font-size:14px;}
.scan-pick{flex:none; min-width:150px; cursor:pointer;}
.spinner{width:34px; height:34px; border-radius:50%; border:3px solid var(--line); border-top-color:var(--brand); animation:spin .8s linear infinite; margin-bottom:6px;}
@keyframes spin{to{transform:rotate(360deg);}}
.import-banner{display:flex; align-items:center; gap:10px; background:var(--green-soft); border:1px solid #D4E8DC; color:var(--brand-deep); border-radius:14px; padding:12px 14px; font-size:13px; font-weight:500; line-height:1.4;}
.import-banner svg{color:var(--green); flex-shrink:0;}
.pay-row{display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #F0F3EE;}
.pay-row:last-of-type{border-bottom:none;}
.pay-mid{flex:1; min-width:0;}
.pay-name{font-weight:600; font-size:13.5px;}
.pay-url{font-size:11.5px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.pay-copy{flex:none; min-width:88px;}
.send-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:8px;}
.link-preview{margin-top:8px; font-size:12px; color:var(--brand); background:var(--green-soft); border-radius:10px; padding:8px 10px; word-break:break-all; font-weight:500;}

/* stuff */
.cat-badge.cat-stuff{background:var(--info-soft); color:var(--info);}
.detail-thing{font-size:26px; line-height:1.25; padding:0 12px;}
.rec-thing{font-size:28px; line-height:1.3; padding:0 8px;}

/* auth */
.auth{min-height:100vh; display:flex; flex-direction:column; justify-content:space-between; background:linear-gradient(165deg,var(--brand) 0%,var(--brand-deep) 100%); padding:64px 26px 44px; color:#fff;}
.auth.form-mode{background:var(--bg); color:var(--ink); justify-content:flex-start; gap:18px; padding:24px 20px;}
.auth-hero{display:flex; flex-direction:column; gap:14px; margin-top:48px;}
.auth-tag{font-family:'Fraunces',Georgia,serif; font-size:24px; font-weight:600; line-height:1.25; margin:0;}
.auth-sub{opacity:.8; font-size:14.5px; line-height:1.55; margin:0; max-width:320px;}
.auth-actions{display:flex; flex-direction:column; gap:10px;}
.wordmark{font-family:'Fraunces',Georgia,serif; font-weight:600; letter-spacing:-.02em; display:flex; align-items:center; line-height:1;}
.wm-o{display:inline-block; width:.72em; height:.72em; border:.09em solid var(--brand); border-radius:50%; border-right-color:transparent; transform:rotate(45deg); margin-right:.06em;}
.ob{gap:16px;}
.ob-progress{display:flex; gap:6px; margin-bottom:6px;}
.ob-seg{flex:1; height:4px; border-radius:99px; background:#DDE3DA;}
.ob-seg.on{background:var(--brand);}
.chip-row.wrap{flex-wrap:wrap;}
`;
