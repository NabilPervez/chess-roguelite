import { useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react';

/**
 * Minimal pointer drag-and-drop that works with mouse and touch.
 * Sources get `source(id)`, one drop zone gets `target()`. A press without movement stays a normal click,
 * so tap-to-select keeps working for keyboard and screen-reader users.
 */
export function useDrag<T>(onDrop: (id: T) => void) {
  const [drag, setDrag] = useState<{ id: T; x: number; y: number; label: string } | null>(null);
  const [over, setOver] = useState(false);
  const start = useRef<{ id: T; x: number; y: number; label: string } | null>(null);
  const zone = useRef<HTMLElement | null>(null);
  const hit = (x: number, y: number) => { const r = zone.current?.getBoundingClientRect(); return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };

  const source = (id: T) => ({
    onPointerDown: (e: RPE<HTMLElement>) => {
      if ((e.currentTarget as HTMLButtonElement).disabled) return;
      start.current = { id, x: e.clientX, y: e.clientY, label: e.currentTarget.querySelector('[aria-hidden]')?.textContent ?? '' };
    },
    onPointerMove: (e: RPE<HTMLElement>) => {
      const s = start.current; if (!s) return;
      if (!drag && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) return;
      if (!drag) e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ ...s, x: e.clientX, y: e.clientY }); setOver(hit(e.clientX, e.clientY));
    },
    onPointerUp: (e: RPE<HTMLElement>) => {
      const s = start.current; start.current = null;
      if (drag && s && hit(e.clientX, e.clientY)) onDrop(s.id);
      if (drag) { e.preventDefault(); const stop = (ev: Event) => ev.stopPropagation(); window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0); }
      setDrag(null); setOver(false);
    },
    onPointerCancel: () => { start.current = null; setDrag(null); setOver(false); },
    style: { touchAction: 'none' as const },
  });
  const target = () => ({ ref: (el: HTMLElement | null) => { zone.current = el; }, 'data-drop': true });
  const ghost: ReactNode = drag ? <span className="drag-ghost" aria-hidden="true" style={{ left: drag.x, top: drag.y }}>{drag.label}</span> : null;
  return { source, target, over, ghost, dragging: !!drag };
}
