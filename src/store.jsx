import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { uid, today } from './lib/constants.js';

// Kunci dan bentuk data sama dengan versi HTML, jadi data lama di browser tetap terbaca.
const KEY = 'qa-agent-v1';
const Ctx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { sets: d.sets || [], execs: d.execs || [] };
    }
  } catch { /* abaikan */ }
  return { sets: [], execs: [] };
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* abaikan */ }
  }, [db]);

  const api = useMemo(() => ({
    db,
    addSet(title, cases) {
      setDb((d) => ({ ...d, sets: [...d.sets, { id: uid(), title, at: today(), cases }] }));
    },
    deleteSet(id) {
      setDb((d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) }));
    },
    addExecution(title, setIds) {
      setDb((d) => {
        const cases = [];
        d.sets.filter((s) => setIds.includes(s.id)).forEach((s) =>
          s.cases.forEach((c) => cases.push({ ...c, s: '', note: '' })));
        return { ...d, execs: [{ id: uid(), title, cases, idx: 0, done: false, report: null }, ...d.execs] };
      });
    },
    deleteExecution(id) {
      setDb((d) => ({ ...d, execs: d.execs.filter((e) => e.id !== id) }));
    },
    updateExec(id, fn) {
      setDb((d) => ({ ...d, execs: d.execs.map((e) => (e.id === id ? fn(e) : e)) }));
    },
  }), [db]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
