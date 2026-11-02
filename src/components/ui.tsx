import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Camera, LoaderCircle, MoonStar, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

export function Logo() { return <span className="brand"><span className="brand-icon"><MoonStar size={25} strokeWidth={1.3} /></span><span>Midnight<span className="brand-second">Memories</span></span></span>; }
export function ErrorMessage({ message, retry, id }: { message: string; retry?: () => void; id?: string }) {
  return <div className="error-box" role="alert" id={id}><AlertCircle size={18} /><span>{message}</span>{retry && <button className="text-button" onClick={retry}>Try again</button>}</div>;
}
export function Loading() { return <div className="loading" role="status"><LoaderCircle className="spin" size={22} /><span>Gathering our little moments…</span></div>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><MoonStar size={28} strokeWidth={1.1} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Sheet({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="sheet" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }} aria-labelledby="sheet-title">
    <header className="sheet-header"><div>{subtitle && <p className="eyebrow">{subtitle}</p>}<h2 id="sheet-title">{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></header>
    <div className="sheet-body">{children}</div>
  </dialog>;
}
export function PhotoImage({ path, alt, className = '', eager = false }: { path?: string | null; alt: string; className?: string; eager?: boolean }) {
  const { preview } = useAuth();
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false); setUrl('');
    if (!path) return;
    if (preview && path.startsWith('https://images.unsplash.com/')) { setUrl(path); return; }
    let stopped = false;
    async function refresh() {
      const result = await supabase?.storage.from('memory-photos').createSignedUrl(path!, 3600);
      if (!stopped && result?.data) setUrl(result.data.signedUrl);
      if (!stopped && result?.error) setFailed(true);
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 50 * 60 * 1000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [path, preview]);
  return url && !failed ? <img className={className} src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} /> :
    <span className={`photo-placeholder ${className}`} role="img" aria-label={failed ? 'Photo unavailable; try refreshing when connected' : alt}><Camera size={30} strokeWidth={1.1} /><span>{failed ? 'A moment, waiting to load' : 'A story worth keeping'}</span></span>;
}
export function PreviewNotice() { const { preview } = useAuth(); return preview ? <p className="preview-notice">You’re exploring sample content. Connect Supabase to save your own stories.</p> : null; }
