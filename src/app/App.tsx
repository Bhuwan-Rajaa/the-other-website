import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, BookHeart, CalendarDays, Check, Heart, Home, LockKeyhole, MoonStar, Plus, Sparkles, UserRound } from 'lucide-react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { WorkspaceProvider, useWorkspace } from '../context/WorkspaceContext';
import { Editors } from '../components/Editors';
import { EmptyState, Loading, Logo } from '../components/ui';
import { dateLabel, today } from '../utils/dates';
const HomePage = lazy(() => import('../pages/HomePage'));
const CalendarPage = lazy(() => import('../pages/CalendarPage'));
const MemoriesPage = lazy(() => import('../pages/MemoriesPage'));
const MemoryPage = lazy(() => import('../pages/MemoryPage'));
const MilestonesPage = lazy(() => import('../pages/MilestonesPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));

const navigation = [
  { to: '/', title: 'Our home', short: 'Home', icon: Home },
  { to: '/calendar', title: 'Our calendar', short: 'Calendar', icon: CalendarDays },
  { to: '/memories', title: 'Our memories', short: 'Memories', icon: BookHeart },
  { to: '/milestones', title: 'Our milestones', short: 'Milestones', icon: Sparkles },
  { to: '/profile', title: 'My little corner', short: 'Profile', icon: UserRound },
];
function Protected() {
  const { profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace />;
  return <AppShell />;
}
function AppShell() {
  const { profile, preview } = useAuth();
  const { openMemory, toast } = useWorkspace();
  const location = useLocation(), reduced = useReducedMotion();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return <div className="app-shell"><a href="#main" className="skip-link">Skip to our story</a><aside className="sidebar"><Link to="/" className="brand-link" aria-label="Midnight Memories home"><Logo /></Link><p className="sidebar-caption">A LITTLE SPACE, JUST FOR US.</p>
    <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'}><item.icon size={19} strokeWidth={1.6} /><span>{item.title}</span><span className="nav-active-dot" /></NavLink>)}</nav>
    <div className="sidebar-note"><MoonStar size={24} strokeWidth={1.1} /><p>Ordinary days.<br /><em>Extraordinary us.</em></p><span>Let’s keep the little things.</span></div>
    <Link to="/profile" className="sidebar-couple"><span className="avatar-pair"><span>B</span><span>P</span></span><span><strong>Bhuwan & Pooja</strong><small><LockKeyhole size={10} />Our private little world</small></span><Heart size={14} /></Link></aside>
    <div className="main-column"><header className="topbar"><div className="topbar-desktop"><span className="topbar-dot" />OUR LITTLE CORNER OF THE WORLD</div><Link to="/" className="mobile-brand" aria-label="Midnight Memories home"><Logo /></Link><div className="topbar-right"><time className="topbar-date">{dateLabel(today(), { weekday: 'short', day: 'numeric', month: 'long' })}</time><button className="button primary topbar-add" onClick={() => openMemory()}><Plus size={16} />Add a memory</button><Link className={`avatar topbar-avatar ${profile?.role}`} to="/profile" aria-label="My profile">{profile?.display_name[0]}</Link></div></header>
      {preview && <div className="preview-banner"><span><Sparkles size={12} />Sample preview · These are illustrative stories. Saving is unavailable until Supabase is connected.</span><Link to="/profile">Preview details<ArrowUpRight size={12} /></Link></div>}
      <main id="main" className="main-content" tabIndex={-1}><motion.div key={location.pathname} initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}><Outlet /></motion.div><footer className="site-footer"><span>Midnight Memories</span><Heart size={11} /><span>Our story. Our pace. Our little forever.</span></footer></main></div>
    <nav className="bottom-nav" aria-label="Mobile navigation">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'}><item.icon size={20} strokeWidth={1.5} /><span>{item.short}</span></NavLink>)}</nav><Editors />
    <AnimatePresence>{toast && <motion.div className="toast" role="status" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={16} />{toast}</motion.div>}</AnimatePresence>
  </div>;
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="fatal-error"><EmptyState title="A little pause in our story" description="Something couldn’t load. Refresh the page to try again." action={<button className="button primary" onClick={() => window.location.reload()}>Refresh page</button>} /></div> : this.props.children; }
}
export default function App() {
  return <ErrorBoundary><Suspense fallback={<Loading />}><BrowserRouter><AuthProvider><WorkspaceProvider><Routes><Route path="/login" element={<LoginPage />} /><Route element={<Protected />}><Route index element={<HomePage />} /><Route path="calendar" element={<CalendarPage />} /><Route path="memories" element={<MemoriesPage />} /><Route path="memories/:id" element={<MemoryPage />} /><Route path="milestones" element={<MilestonesPage />} /><Route path="profile" element={<ProfilePage />} /><Route path="*" element={<EmptyState title="A little off the path" description="Let’s find our way back." action={<Link to="/" className="button primary">Back to our home</Link>} />} /></Route></Routes></WorkspaceProvider></AuthProvider></BrowserRouter></Suspense></ErrorBoundary>;
}
