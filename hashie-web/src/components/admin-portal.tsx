'use client';

import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Check, ChevronDown, ChevronLeft, CircleHelp,
  ClipboardList, Cloud, Code2, Database, FileText, Headphones, LayoutDashboard, LifeBuoy, Menu,
  MoreHorizontal, Search, Server, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Users, X,
} from 'lucide-react';

type NavKey = 'Overview' | 'Users' | 'Content' | 'Safety' | 'Support' | 'Operations';
type Status = 'Healthy' | 'Draft' | 'In review' | 'Published' | 'High' | 'Medium' | 'Low' | 'New' | 'Triaged' | 'Open' | 'Pending' | 'Escalated';

const nav: { label: NavKey; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Users', icon: Users }, { label: 'Content', icon: FileText },
  { label: 'Safety', icon: ShieldCheck }, { label: 'Support', icon: Headphones }, { label: 'Operations', icon: Settings },
];
const dependencies = [
  ['API', Code2, '99.97%', '187 ms', '12'], ['Database', Database, '99.98%', '8 ms', '0'],
  ['Intelligence gateway', Sparkles, '99.96%', '312 ms', '5'], ['Speech services', Activity, '99.93%', '421 ms', '18'], ['Storage', Cloud, '100.00%', '106 ms', '0'],
] as const;
const content = [
  ['CNT-8F2D71', '███████', 'English', 'Draft', '—', '25m'], ['CNT-7A19C3', '███████', 'Twi', 'In review', 'Reviewer 12', '54m'],
  ['CNT-6D8B9F', '███████', 'Ga', 'In review', 'Reviewer 07', '1h 57m'], ['CNT-4B7E20', '███████', 'English', 'Published', 'Reviewer 03', '16h'],
  ['CNT-3C9A0E', '███████', 'Ewe', 'Published', 'Reviewer 14', '18h'], ['CNT-2F6B44', '███████', 'Dagbani', 'Draft', '—', '21h'],
];
const events = [['SRV-19E2A7', '████████', 'High', 'New', '14m'], ['SRV-18C4D9', '████████', 'High', 'Triaged', '1h 02m'], ['SRV-17B3F1', '████████', 'Medium', 'In review', '1h 41m'], ['SRV-16A7E4', '████████', 'Medium', 'New', '2h 15m'], ['SRV-15D2C8', '████████', 'Low', 'Triaged', '3h 22m']];
const tickets = [['SUP-7D1F9B', '█████████', 'Content issue', '████', 'High', 'Open', '27m'], ['SUP-6C2E7A', '█████████', 'Access', '████', 'Medium', 'Open', '1h 19m'], ['SUP-5B8A3C', '█████████', 'Technical', '████', 'Low', 'Pending', '2h 03m'], ['SUP-4A6D2F', '█████████', 'Billing', '████', 'Medium', 'Open', '3h 48m'], ['SUP-3F9B1E', '█████████', 'Content issue', '████', 'High', 'Escalated', '5h 12m']];

function Badge({ children }: { children: Status }) { return <span className={`badge badge-${children.toLowerCase().replaceAll(' ', '-')}`}>{children}</span>; }
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <div className="section-heading"><h2>{title}</h2>{action && <button className="text-button" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div>; }
function HealthIcon({ icon: Icon }: { icon: typeof Code2 }) { return <span className="health-icon"><Icon size={16} /></span>; }

export function AdminPortal({ previewMode }: { previewMode: boolean }) {
  const [active, setActive] = useState<NavKey>('Operations');
  const [range, setRange] = useState('7 days');
  const [query, setQuery] = useState('');
  const [maintenance, setMaintenance] = useState(false);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const filteredContent = useMemo(() => content.filter(row => row.join(' ').toLowerCase().includes(query.toLowerCase())), [query]);
  const toggleMaintenance = () => { setMaintenance(value => !value); setConfirmMaintenance(false); setNotice(maintenance ? 'Maintenance mode disabled.' : 'Maintenance mode enabled for preview.'); };

  return <div className="portal-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">H</span><span>Hashie</span></div>
      <nav aria-label="Admin sections">{nav.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setNotice(`${label} view selected.`); }}><Icon size={18} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><CircleHelp size={18} /><span>Help center</span></button><button className="collapse"><ChevronLeft size={18} />Collapse</button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" aria-label="Open navigation"><Menu size={20} /></button><div className="top-title"><h1>{active === 'Operations' ? 'Operations overview' : `${active} overview`}</h1><p>Private operations workspace</p></div><div className="top-actions"><button className="date-button"><ClipboardList size={16} />May 13 – May 19, 2025<ChevronDown size={14} /></button><label className="search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by ID or label..." aria-label="Search by ID or label" /><kbd>⌘ K</kbd></label><button className="profile"><span className="avatar">AR</span><span className="profile-copy"><strong>A. Reviewer</strong><small>Reviewer</small></span><ChevronDown size={14} /></button></div></header>
      {previewMode && <div className="preview-banner"><span><AlertTriangle size={16} />Local preview mode — Clerk is not configured. Production admin API authorization remains server-side.</span><button onClick={() => setNotice('Connect Clerk to use the live admin API.')}>Learn more</button></div>}
      {notice && <div className="notice" role="status"><Check size={15} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></div>}
      <div className="dashboard-grid">
        <section className="panel health-panel"><SectionHeader title="System health" action="View system status" onAction={() => setNotice('System status details selected.')} /><div className="panel-subtitle"><span>All core systems are operating normally.</span><span className="overall-status"><Check size={14} />Healthy</span></div><table><thead><tr><th>Dependency</th><th>Status</th><th>Uptime (7d)</th><th>Latency (p95)</th><th>Errors (7d)</th></tr></thead><tbody>{dependencies.map(([name, Icon, uptime, latency, errors]) => <tr key={name}><td><span className="dependency"><HealthIcon icon={Icon} />{name}</span></td><td><span className="inline-status"><Check size={13} />Healthy</span></td><td>{uptime}</td><td>{latency}</td><td>{errors}</td></tr>)}</tbody></table><div className="panel-footer">Last updated · May 19, 2025 10:24 AM GMT <button className="text-button" onClick={() => setNotice('System status details selected.')}>View system status <ArrowRight size={15} /></button></div></section>
        <section className="panel provider-panel"><div className="section-heading"><h2>Provider reliability</h2><div className="maintenance-wrap">Maintenance mode <button className={`switch ${maintenance ? 'on' : ''}`} aria-label="Toggle maintenance mode" aria-pressed={maintenance} onClick={() => setConfirmMaintenance(true)}><span /></button><button className="manage-button" onClick={() => setNotice('Provider configuration selected.')}><SlidersHorizontal size={15} />Manage</button></div></div><div className="chart-tools"><span>Latency (ms)</span><span className="legend"><i className="line green" />Latency (p95) <i className="line red" />Error rate (%)</span><select value={range} onChange={event => setRange(event.target.value)} aria-label="Provider time range"><option>7 days</option><option>30 days</option><option>90 days</option></select></div><div className="chart" aria-label={`Provider latency and error rate for ${range}`}><svg viewBox="0 0 620 150" role="img"><path className="grid-line" d="M0 25H620M0 62H620M0 99H620M0 136H620" /><path className="latency-line" d="M18 92 L112 92 L206 84 L300 85 L394 78 L488 78 L582 70" /><path className="error-line" d="M18 135 L112 135 L206 135 L300 119 L394 135 L488 135 L582 119" />{[18,112,206,300,394,488,582].map(x => <circle key={x} cx={x} cy={x === 18 || x === 112 ? 92 : x === 206 || x === 300 ? 84 : x === 394 || x === 488 ? 78 : 70} r="3.5" className="latency-dot" />)}</svg><div className="chart-labels"><span>May 13</span><span>May 14</span><span>May 15</span><span>May 16</span><span>May 17</span><span>May 18</span><span>May 19</span></div></div><table><thead><tr><th>Provider</th><th>Latency (p95)</th><th>Error rate (7d)</th><th>Availability (7d)</th><th>Status</th></tr></thead><tbody>{[['Intelligence gateway','312 ms','0.18%','99.96%'],['Speech services','421 ms','0.25%','99.93%'],['Storage','106 ms','0.00%','100.00%']].map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={cell}>{i === 4 ? <span className="inline-status"><Check size={13} />Healthy</span> : cell}</td>)}</tr>)}</tbody></table><div className="panel-footer end"><button className="text-button" onClick={() => setNotice('Provider details selected.')}>View provider details <ArrowRight size={15} /></button></div></section>
        <section className="panel content-panel"><SectionHeader title="Reviewed content" action="View all" onAction={() => setNotice('Reviewed content queue selected.')} /><div className="table-actions"><select aria-label="Content filter"><option>All content</option><option>Drafts</option><option>In review</option><option>Published</option></select><span>{filteredContent.length} of 112</span></div><table><thead><tr><th>ID</th><th>Title <em>(redacted)</em></th><th>Language</th><th>Status</th><th>Reviewer</th><th>Age</th></tr></thead><tbody>{filteredContent.map(row => <tr key={row[0]} className={selectedRow === row[0] ? 'selected' : ''} onClick={() => setSelectedRow(row[0])}>{row.map((cell, index) => <td key={cell}>{index === 3 ? <Badge>{cell as Status}</Badge> : cell}</td>)}</tr>)}</tbody></table><div className="pagination"><span>Showing 1–{filteredContent.length} of 112</span><button aria-label="Previous page"><ChevronLeft size={14} /></button><button className="current">1</button><button>2</button><button>3</button><span>…</span><button>19</button><button aria-label="Next page"><ArrowRight size={14} /></button></div></section>
        <section className="panel safety-panel"><SectionHeader title="Safety review" action="View all events" onAction={() => setNotice('Safety event queue selected.')} /><table><thead><tr><th>ID</th><th>Event <em>(redacted)</em></th><th>Severity</th><th>Status</th><th>Age</th></tr></thead><tbody>{events.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={cell}>{index === 2 || index === 3 ? <Badge>{cell as Status}</Badge> : cell}</td>)}</tr>)}</tbody></table><div className="panel-footer end"><button className="text-button" onClick={() => setNotice('Safety event queue selected.')}>View full queue <ArrowRight size={15} /></button></div></section>
        <section className="panel support-panel"><div className="section-heading"><h2>Support queue</h2><div className="table-actions"><select aria-label="Support category"><option>All categories</option><option>Access</option><option>Technical</option><option>Content issue</option></select><button className="text-button" onClick={() => setNotice('Support queue selected.')}>View all tickets <ArrowRight size={15} /></button></div></div><table><thead><tr><th>ID</th><th>Subject <em>(redacted)</em></th><th>Category</th><th>Requester <em>(redacted)</em></th><th>Priority</th><th>Status</th><th>Age</th></tr></thead><tbody>{tickets.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={cell}>{index === 4 || index === 5 ? <Badge>{cell as Status}</Badge> : cell}</td>)}</tr>)}</tbody></table><div className="pagination"><span>Showing 1–5 of 68</span><button aria-label="Previous page"><ChevronLeft size={14} /></button><button className="current">1</button><button>2</button><button>3</button><span>…</span><button>14</button><button aria-label="Next page"><ArrowRight size={14} /></button></div></section>
      </div>
      {confirmMaintenance && <div className="modal-backdrop" role="presentation"><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="maintenance-title"><button className="close-modal" onClick={() => setConfirmMaintenance(false)} aria-label="Close"><X size={17} /></button><div className="modal-icon"><AlertTriangle size={22} /></div><h2 id="maintenance-title">Change maintenance mode?</h2><p>{maintenance ? 'This will make the admin preview available again.' : 'This will signal that Hashie is undergoing planned maintenance.'}</p><div className="modal-actions"><button className="secondary-button" onClick={() => setConfirmMaintenance(false)}>Cancel</button><button className="primary-button" onClick={toggleMaintenance}>Confirm change</button></div></div></div>}
    </main>
  </div>;
}
