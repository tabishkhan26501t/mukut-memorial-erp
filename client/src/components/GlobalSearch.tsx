import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, GraduationCap, BookOpen, ClipboardList, Bell, X } from 'lucide-react';
import { searchService } from '@/services/data.service';
import { SearchResults } from '@/types';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchService.search(q)
        .then(setResults)
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const total = results
    ? results.students.length + results.teachers.length + results.classes.length + results.subjects.length + results.notifications.length
    : 0;

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          aria-label="Search students, teachers, classes, subjects and notifications"
          className="input pl-9 pr-8 h-9 text-sm"
          placeholder="Search students, teachers, classes..."
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-surface-500 hover:text-surface-700 transition-colors"
            tabIndex={-1}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-surface-900 rounded-2xl shadow-modal border border-surface-100 dark:border-surface-800 overflow-hidden z-50">
          {loading ? (
            <div className="p-4 text-sm text-surface-500 text-center">Searching...</div>
          ) : results && total > 0 ? (
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {results.students.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 px-3 pt-2 pb-1 flex items-center gap-1"><Users size={11} /> Students</p>
                  {results.students.map((s) => (
                    <button key={s.id} onClick={() => go('/students')} className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-sm flex items-center justify-between gap-2 transition-colors">
                      <span className="truncate">{s.name}</span>
                      <span className="text-xs text-surface-500 flex-shrink-0">{s.admissionNo}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.teachers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 px-3 pt-2 pb-1 flex items-center gap-1"><GraduationCap size={11} /> Teachers</p>
                  {results.teachers.map((t) => (
                    <button key={t.id} onClick={() => go('/teachers')} className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-sm flex items-center justify-between gap-2 transition-colors">
                      <span className="truncate">{t.name}</span>
                      <span className="text-xs text-surface-500 flex-shrink-0">{t.teacherId}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.classes.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 px-3 pt-2 pb-1 flex items-center gap-1"><BookOpen size={11} /> Classes</p>
                  {results.classes.map((c) => (
                    <button key={c.id} onClick={() => go('/classes')} className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-sm transition-colors">
                      {c.name}{c.section ? ` - ${c.section}` : ''}
                    </button>
                  ))}
                </div>
              )}
              {results.subjects.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 px-3 pt-2 pb-1 flex items-center gap-1"><ClipboardList size={11} /> Subjects</p>
                  {results.subjects.map((s) => (
                    <button key={s.id} onClick={() => go('/subjects')} className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-sm transition-colors">
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {results.notifications.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 px-3 pt-2 pb-1 flex items-center gap-1"><Bell size={11} /> Notifications</p>
                  {results.notifications.map((n) => (
                    <button key={n.id} onClick={() => go('/notifications')} className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-sm truncate transition-colors">
                      {n.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-sm text-surface-500 text-center">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
