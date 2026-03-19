import { useState, useEffect } from 'react';

let _toastCb = null;

/** Показывает всплывающее уведомление. Можно вызывать из любого места. */
export const toast = (msg, type = 'info') => {
  if (_toastCb) _toastCb(msg, type);
};

export default function Toasts() {
  const [list, setList] = useState([]);

  useEffect(() => {
    const timers = new Set();
    _toastCb = (msg, type) => {
      const id = Date.now();
      setList(p => [...p, { id, msg, type }]);
      const t = setTimeout(() => { setList(p => p.filter(x => x.id !== id)); timers.delete(t); }, 3000);
      timers.add(t);
    };
    return () => { timers.forEach(clearTimeout); _toastCb = null; };
  }, []);

  return (
    <div className="toast-wrap" role="status" aria-live="polite" aria-atomic="false">
      {list.map(t => (
        <div key={t.id} className={'toast ' + t.type} aria-atomic="true">{t.msg}</div>
      ))}
    </div>
  );
}
