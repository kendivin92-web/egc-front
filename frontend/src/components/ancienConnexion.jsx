import { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
// ─────────────────────────────────────────────
// THÈME  (clair par défaut, sombre en option)
// ─────────────────────────────────────────────
const useTheme = () => {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("egc-theme");
    return saved ? saved === "dark" : false; // clair par défaut
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("egc-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("egc-theme", "light");
    }
  }, [dark]);

  return { dark, toggle: () => setDark(v => !v) };
};

// ─────────────────────────────────────────────
// BIBLE — IndexedDB natif (cache persistant)
// ─────────────────────────────────────────────
function openBibleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("egc-bible", 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore("data");
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = ()  => reject(new Error("IndexedDB indisponible"));
  });
}

async function getBibleData() {
  const db = await openBibleDB();
  const cached = await new Promise((resolve, reject) => {
    const req = db.transaction("data", "readonly").objectStore("data").get("bible-fr");
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = ()  => reject();
  });
  if (cached) return cached;
  const res = await fetch("/bible-fr.json");
  if (!res.ok) throw new Error("Fichier introuvable");
  const data = await res.json();
  await new Promise((resolve, reject) => {
    const req = db.transaction("data", "readwrite").objectStore("data").put(data, "bible-fr");
    req.onsuccess = () => resolve();
    req.onerror   = ()  => reject();
  });
  return data;
}

// Cache en mémoire partagé entre toutes les pages
let _bibleCache = null;
let _biblePromise = null;

async function loadBible() {
  if (_bibleCache) return _bibleCache;
  if (_biblePromise) return _biblePromise;
  _biblePromise = getBibleData().then(d => { _bibleCache = d; return d; });
  return _biblePromise;
}

// ─────────────────────────────────────────────
// RÔLES & PERMISSIONS
// ─────────────────────────────────────────────
const ROLES = { super_admin: "super_admin", admin: "admin" };

const PERMISSIONS = {
  [ROLES.super_admin]: ["dashboard","announce","stats","manuel","students","live","admins"],
  [ROLES.admin]:       ["students"],
};

const canAccess = (role, sectionId) => (PERMISSIONS[role] || []).includes(sectionId);

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
  const icons = {
    dashboard:   <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />,
    announce:    <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm0 4a4 4 0 100 8 4 4 0 000-8z" />,
    stats:       <path d="M3 3v18h18M7 16l4-4 4 4 4-8" />,
    manuel:      <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 22h16M4 19.5V4.5A.5.5 0 014.5 4H20v13" />,
    event:       <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
    students:    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
    live:        <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />,
    menu:        <path d="M3 12h18M3 6h18M3 18h18" />,
    close:       <path d="M18 6L6 18M6 6l12 12" />,
    print:       <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-2 0v4H8v-4h8z" />,
    send:        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
    plus:        <path d="M12 5v14M5 12h14" />,
    search:      <path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />,
    bell:        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />,
    user:        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />,
    church:      <path d="M12 2L9 5H7v2l-4 3v12h18V10l-4-3V5h-2L12 2zM10 22v-5h4v5" />,
    download:    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />,
    edit:        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
    trash:       <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
    logout:      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
    lock:        <path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" />,
    mail:        <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 0l8 9 8-9" />,
    eye:         <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff:      <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    shield:      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    crown:       <path d="M2 17l2-8 4 4 4-9 4 9 4-4 2 8H2z" />,
    check:       <path d="M20 6L9 17l-5-5" />,
    x:           <path d="M18 6L6 18M6 6l12 12" />,
    info:        <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    pdf:         <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1v5h5M9 13h6M9 17h6M9 9h1" />,
    image:       <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></>,
    sun:         <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
    moon:        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
    wifi:        <><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></>,
    wifiOff:     <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></>,
    externalLink:<><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    copy:        <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
    share:       <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ─────────────────────────────────────────────
// NAV ITEMS
// ─────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Tableau de bord",  icon: "dashboard" },
  { id: "announce",  label: "Publier annonces", icon: "announce"  },
  { id: "manuel",    label: "Manuel d'étude",   icon: "manuel"    },
  { id: "students",  label: "Fidèles",          icon: "students"  }
];

// ─────────────────────────────────────────────
// CLASSES RÉUTILISABLES
// ─────────────────────────────────────────────
const inputCls = [
  "w-full rounded-lg px-3 py-2.5 text-sm transition-colors",
  "bg-white border border-gray-300 text-gray-900 placeholder-gray-400",
  "focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
  "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500",
  "dark:focus:ring-amber-900/40",
].join(" ");

const selectCls = [
  "rounded-lg px-3 py-2.5 text-sm transition-colors",
  "bg-white border border-gray-300 text-gray-700",
  "focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
  "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300",
  "dark:focus:ring-amber-900/40",
].join(" ");

const btnPrimary = "flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors";

// ─────────────────────────────────────────────
// BADGE RÔLE
// ─────────────────────────────────────────────
const RoleBadge = ({ role, size = "sm" }) => {
  const isSuperAdmin = role === ROLES.super_admin;
  const px = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${px} ${
      isSuperAdmin
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
        : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
    }`}>
      <Icon name={isSuperAdmin ? "crown" : "shield"} size={10} />
      {isSuperAdmin ? "Super Admin" : "Administrateur"}
    </span>
  );
};

// ─────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────
const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm dark:shadow-none ${className}`}>
    {children}
  </div>
);

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, maxWidth = "max-w-lg" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 font-serif text-base">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
    error:   "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
    info:    "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
  };
  const iconName = type === "success" ? "check" : type === "error" ? "x" : "info";
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 border rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${colors[type]}`}>
      <Icon name={iconName} size={16} />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><Icon name="close" size={14} /></button>
    </div>
  );
};

// ─────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────
const Spinner = ({ size = 4 }) => (
  <svg className={`animate-spin w-${size} h-${size}`} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/>
  </svg>
);



// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
const Sidebar = ({ active, onSelect, open, onClose, user, onLogout }) => (
  <>
    {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}
    <aside className={`
      fixed top-0 left-0 h-full z-30 flex flex-col w-64
      bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
      transition-transform duration-300 ease-in-out
      ${open ? "translate-x-0" : "-translate-x-full"}
      lg:translate-x-0 lg:static lg:flex
    `}>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/20 border border-amber-100 dark:border-transparent flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Icon name="church" size={20} />
        </div>
        <div>
          <p className="text-gray-900 dark:text-gray-100 font-bold text-sm leading-tight font-serif">EGC Brazzaville</p>
          <p className="text-gray-400 text-xs">Administration</p>
        </div>
        <button onClick={onClose} className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <Icon name="close" size={18} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV_ITEMS.filter(item => canAccess(user.role, item.id)).map(item => (
          <button key={item.id} onClick={() => { onSelect(item.id); onClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left ${
              active === item.id
                ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}>
            <Icon name={item.icon} size={17} />
            {item.label}
            {active === item.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/30 border border-amber-100 dark:border-transparent flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Icon name="user" size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-gray-800 dark:text-gray-200 text-xs font-medium truncate">{user.nom || "Administrateur"}</p>
            <RoleBadge role={user.role} size="xs" />
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
          <Icon name="logout" size={15} /> Se déconnecter
        </button>
      </div>
    </aside>
  </>
);

// ─────────────────────────────────────────────
// TOP BAR  (avec bouton thème)
// ─────────────────────────────────────────────
const TopBar = ({ title, onMenuClick }) => (
  <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
    <button onClick={onMenuClick} className="lg:hidden text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1">
      <Icon name="menu" size={22} />
    </button>
    <h1 className="text-gray-900 dark:text-gray-100 font-semibold text-base font-serif">{title}</h1>
  </header>
);

// ─────────────────────────────────────────────
// ACCÈS REFUSÉ
// ─────────────────────────────────────────────
const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
    <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400">
      <Icon name="lock" size={26} />
    </div>
    <div>
      <p className="text-gray-900 dark:text-gray-100 font-semibold font-serif text-lg">Accès non autorisé</p>
      <p className="text-gray-500 text-sm mt-1">Votre rôle ne vous permet pas d'accéder à cette section.</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// SECTION : TABLEAU DE BORD
// ─────────────────────────────────────────────
const SectionDashboard = () => {
  const [nombre, setNombre]             = useState("--");
  const [baptise, setBaptise]           = useState("--");
  const [nonbaptise, setnonBaptise]     = useState("--");
  const [nombreFidele, setNombreFidele] = useState("--");
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const fetchNombre = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/nombre/inscrit`);
        if (!response.ok) throw new Error(`Erreur : ${response.status}`);
        const data = await response.json();
        setNombre(data.nombre);
        setNombreFidele(data.fidele ?? data.serviteur);
        setBaptise(data.baptise);
        setnonBaptise(data.non_bapteme);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNombre();
  }, []);

  const stats = [
    { label: "Total Membres",        value: nombre,       icon: "students", color: "text-amber-500",   accent: "border-l-amber-400"   },
    { label: "Serviteurs",           value: nombreFidele, icon: "event",    color: "text-emerald-500", accent: "border-l-emerald-400" },
    { label: "Âmes baptisées",       value: baptise,      icon: "announce", color: "text-sky-500",     accent: "border-l-sky-400"     },
    { label: "Non baptisé(e)s",      value: nonbaptise,   icon: "manuel",   color: "text-rose-500",    accent: "border-l-rose-400"    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className={`border-l-4 ${s.accent}`}>
            <div className={`${s.color} mb-2`}><Icon name={s.icon} size={22} /></div>
            <p className="text-gray-900 dark:text-gray-100 text-2xl font-bold">{loading ? "…" : s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION : ANNONCES
// ─────────────────────────────────────────────
const SectionAnnonce = () => {
  const [titre, setTitre]         = useState("");
  const [heure, setHeure]         = useState("");
  const [contenu, setContenu]     = useState("");
  const [type, setType]           = useState("Culte");
  const [dateEvent, setDateEvent] = useState("");
  const [lieu, setLieu]           = useState("");
  const [image, setImage]         = useState(null);
  const [preview, setPreview]     = useState(null);
  const [annonces, setAnnonces]   = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending]     = useState(false);
  const [toast, setToast]         = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const handleImageChange = (file) => {
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleImageChange(e.dataTransfer.files[0]);
  };

  const handlePrePublish = () => {
    if (!titre.trim() || !dateEvent) {
      setToast({ message: "Veuillez renseigner un titre et une date.", type: "error" });
      return;
    }
    setShowConfirm(true);
  };

  const handlePublish = async () => {
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("titre", titre);
      formData.append("contenu", contenu);
      formData.append("type", type);
      formData.append("dateEvent", dateEvent);
      formData.append("lieu", lieu);
      formData.append("heure", heure);
      if (image) formData.append("image", image);

      const res = await fetch(`${API}/api/annonces`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 409) { return setToast({ message: "Cette annonce existe déjà.", type: "error" }); }
      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();
      setAnnonces([data, ...annonces]);
      setTitre(""); setContenu(""); setDateEvent(""); setLieu(""); setHeure("");
      setImage(null); setPreview(null);
      setShowConfirm(false);
      setToast({ message: "Annonce publiée avec succès !", type: "success" });
    } catch {
      setShowConfirm(false);
      setToast({ message: "Échec de l'envoi. Vérifiez votre connexion.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmer la publication">
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">Vérifiez les informations avant de publier :</p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Type :</span><span className="text-gray-800 dark:text-gray-200 font-medium">{type}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Titre :</span><span className="text-gray-800 dark:text-gray-200 font-medium">{titre}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Date :</span><span className="text-gray-800 dark:text-gray-200 font-medium">{dateEvent}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Lieu :</span><span className="text-gray-800 dark:text-gray-200 font-medium">{lieu || "—"}</span></div>
            {contenu && <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Message :</span><span className="text-gray-700 dark:text-gray-300">{contenu}</span></div>}
            {preview && <div><img src={preview} alt="aperçu" className="mt-2 h-24 object-cover rounded-lg" /></div>}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowConfirm(false)}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Modifier
            </button>
            <button onClick={handlePublish} disabled={sending}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {sending ? <><Spinner />Envoi…</> : <><Icon name="send" size={15} />Publier</>}
            </button>
          </div>
        </div>
      </Modal>
      <Card>
        <h3 className="font-semibold text-sm mb-4 font-serif text-gray-800 dark:text-gray-200">Publier une annonce</h3>
        <div className="space-y-3">
          <p className="text-gray-400 text-xs ml-1">Type d'événement</p>
          <select value={type} onChange={e => setType(e.target.value)} className={`w-full ${selectCls}`}>
            <option>Culte</option><option>Formation</option><option>Prière</option>
            <option>Retraite</option><option>Spéciaux</option>
          </select>
          <p className="text-gray-400 text-xs ml-1">Titre de l'annonce</p>
          <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'annonce" className={inputCls} />
          <p className="text-gray-400 text-xs ml-1">Lieu</p>
          <input type="text" value={lieu} placeholder="Lieu du culte" onChange={e => setLieu(e.target.value)} className={inputCls} />
          <div>
            <p className="text-gray-400 text-xs ml-1 mb-1">Date (futures uniquement)</p>
            <input type="date" value={dateEvent} min={today} onChange={e => setDateEvent(e.target.value)} className={inputCls} />
          </div>
          <div>
            <p className="text-gray-400 text-xs ml-1 mb-1">Heure de début</p>
            <input type="text" minLength={5} maxLength={7} value={heure} onChange={e => setHeure(e.target.value)} placeholder="Ex: 10H:30" className={inputCls} />
          </div>
          <p className="text-gray-400 text-xs ml-1">Description</p>
          <textarea value={contenu} onChange={e => setContenu(e.target.value)} placeholder="Description de l'annonce…" rows={4} className={`${inputCls} resize-none`} />
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-amber-300 transition-colors">
            <input type="file" accept="image/*" onChange={e => handleImageChange(e.target.files[0])} className="hidden" id="fileUpload" />
            <p className="text-gray-400 text-xs mb-1">Image illustrative</p>
            <label htmlFor="fileUpload" className="cursor-pointer text-sm text-gray-400">Glisser une image ici ou cliquer pour sélectionner</label>
            {preview && <img src={preview} alt="preview" className="mt-3 h-32 object-cover mx-auto rounded" />}
          </div>
          <div className="flex justify-end">
            <button onClick={handlePrePublish} className={btnPrimary}>
              <Icon name="send" size={15} /> Publier une annonce
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION : MANUEL D'ÉTUDE  (avec PDF + image)
// ─────────────────────────────────────────────
const SectionManuel = () => {
  const [titre, setTitre]             = useState("");
  const [pdfFile, setPdfFile]         = useState(null);
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors]           = useState({});
  const [uploading, setUploading]     = useState(false);
  const [toast, setToast]             = useState(null);
  const pdfRef = useRef();
  const imgRef = useRef();


  const handleImageChange = (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors(e => ({ ...e, image: "" }));
  };

  const handleDropImage = (e) => {
    e.preventDefault();
    handleImageChange(e.dataTransfer.files[0]);
  };

  const handleDropPdf = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setErrors(e => ({ ...e, pdf: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!titre.trim())   errs.titre = "Le titre est obligatoire.";
    if (!pdfFile)        errs.pdf   = "Le fichier PDF est obligatoire.";
    if (!imageFile)      errs.image = "L'image illustrative est obligatoire.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("titre", titre);
      formData.append("pdf", pdfFile);
      formData.append("image", imageFile);

      const res = await fetch(`${API}/api/manuels`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setTitre(""); setPdfFile(null); setImageFile(null); setImagePreview(null);
      setToast({ message: "Manuel ajouté avec succès !", type: "success" });
    } catch (error) {
      console.error("Manual upload failed:", error);
      setToast({ message: "Échec de l’ajout du manuel. Vérifiez la connexion à l’API.", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const fieldErr = (key) => errors[key] ? (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><Icon name="x" size={11} />{errors[key]}</p>
  ) : null;

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Card>
        <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-sm mb-4 font-serif">Ajouter un manuel d'étude</h3>
        <div className="space-y-4">
          {/* Titre */}
          <div>
            <label className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1.5 block">
              Titre du manuel <span className="text-red-400">*</span>
            </label>
            <input value={titre} onChange={e => { setTitre(e.target.value); setErrors(er => ({...er, titre:""})); }}
              placeholder="Ex: Fondements de la foi chrétienne"
              className={`${inputCls} ${errors.titre ? "border-red-400 focus:border-red-400" : ""}`} />
            {fieldErr("titre")}
          </div>


          {/* PDF */}
          <div>
            <label className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1.5 block">
              Fichier PDF <span className="text-red-400">*</span>
            </label>
            <div onDrop={handleDropPdf} onDragOver={e => e.preventDefault()}
              onClick={() => pdfRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                errors.pdf
                  ? "border-red-300 bg-red-50 dark:bg-red-900/10"
                  : pdfFile
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
              }`}>
              <input ref={pdfRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => { if (e.target.files[0]) { setPdfFile(e.target.files[0]); setErrors(er => ({...er, pdf:""})); } }} />
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Icon name="pdf" size={20} />
                  <div className="text-left">
                    <p className="text-sm font-medium">{pdfFile.name}</p>
                    <p className="text-xs text-gray-400">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setPdfFile(null); }}
                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ) : (
                <div className="text-gray-400">
                  <div className="flex justify-center mb-1 text-gray-300 dark:text-gray-600"><Icon name="pdf" size={28} /></div>
                  <p className="text-sm">Glisser le PDF ici ou <span className="text-amber-500">cliquer</span></p>
                  <p className="text-xs mt-0.5">Fichiers .pdf uniquement</p>
                </div>
              )}
            </div>
            {fieldErr("pdf")}
          </div>

          {/* Image */}
          <div>
            <label className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1.5 block">
              Image illustrative <span className="text-red-400">*</span>
            </label>
            <div onDrop={handleDropImage} onDragOver={e => e.preventDefault()}
              onClick={() => imgRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                errors.image
                  ? "border-red-300 bg-red-50 dark:bg-red-900/10"
                  : imagePreview
                  ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
              }`}>
              <input ref={imgRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleImageChange(e.target.files[0])} />
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="h-32 object-cover mx-auto rounded-lg" />
                  <button onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ) : (
                <div className="text-gray-400">
                  <div className="flex justify-center mb-1 text-gray-300 dark:text-gray-600"><Icon name="image" size={28} /></div>
                  <p className="text-sm">Glisser l'image ici ou <span className="text-amber-500">cliquer</span></p>
                  <p className="text-xs mt-0.5">JPG, PNG, WebP</p>
                </div>
              )}
            </div>
            {fieldErr("image")}
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={handleAdd} disabled={uploading} className={`${btnPrimary} disabled:bg-amber-300`}>
              {uploading ? <><Spinner />Envoi…</> : <><Icon name="plus" size={15} />Ajouter le manuel</>}
            </button>
          </div>
        </div>
      </Card>

    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION : FIDÈLES
// ─────────────────────────────────────────────
const SectionStudents = () => {
  const [fideles, setFideles]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterDept, setFilterDept]     = useState("Tous");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [selected, setSelected]         = useState(new Set());
  const [detailFidele, setDetailFidele] = useState(null);
  const [editMode, setEditMode]         = useState(false);
  const [editData, setEditData]         = useState({});
  const [toast, setToast]               = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchFideles = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token"); 
        const res = await fetch(`${API}/api/listeInscription`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFideles(data);
      } catch {
        setToast({ message: "Erreur lors du chargement des fidèles.", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchFideles();
  }, []);

  const departements = ["Tous", ...new Set(fideles.map(f => f.services).filter(Boolean))];
  const statuts      = ["Tous", ...new Set(fideles.map(f => f.statut).filter(Boolean))];

  const filtered = fideles.filter(f => {
    const q = search.toLowerCase();
    return (
      ((f.nom||"").toLowerCase().includes(q) || (f.prenom||"").toLowerCase().includes(q) || (f.telephone||"").includes(q)) &&
      (filterDept === "Tous" || f.services === filterDept) &&
      (filterStatut === "Tous" || f.statut === filterStatut)
    );
  });

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(f => f.id)));
  };

  const handlePrint = () => {
    const toPrint = selected.size > 0 ? fideles.filter(f => selected.has(f.id)) : filtered;
    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Liste des fidèles – EGC Brazzaville</title>
      <style>body{font-family:serif;padding:20px}h1{font-size:16px;margin-bottom:8px}p{font-size:12px;color:#666;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f5f5f5;padding:6px 10px;text-align:left;border-bottom:2px solid #ddd}
      td{padding:5px 10px;border-bottom:1px solid #eee}</style></head><body>
      <h1>Eglise Glorieuse de Christ</h1>
      <p>Imprimé le ${new Date().toLocaleDateString("fr-FR")} · ${toPrint.length} fidèle(s)</p>
      <table><thead><tr><th>#</th><th>Nom</th><th>Prénom</th><th>Téléphone 1</th><th>Téléphone 2</th><th>Arrondissement</th><th>Département</th></tr></thead>
      <tbody>${toPrint.map((f,i)=>`<tr><td>${i+1}</td><td>${f.nom||""}</td><td>${f.prenom||""}</td><td>${f.telephone1||""}</td><td>${f.telephone2||"Aucun"}</td><td>${f.arrondissement||""}</td><td>${f.services||"___"}</td></tr>`).join("")}</tbody></table>
      </body></html>`);
    win.document.close();
    win.print();
  };

  const handleExportExcel = () => {
    const toExport = selected.size > 0 ? fideles.filter(f => selected.has(f.id)) : filtered;
    if (toExport.length === 0) return;

    const rows = toExport.map((f, i) => ({
      "#": i + 1,
      "Nom": f.nom || "",
      "Prénom": f.prenom || "",
      "Téléphone 1": f.telephone1 || "",
      "Téléphone 2": f.telephone2 || "Aucun",
      "Adresse": f.adresse || "",
      "Ville": f.ville || "",
      "Arrondissement": f.arrondissement || "",
      "Baptisé(e)": f.bapteme || "",
      "Statut": f.statut || "",
      "Département": f.services || "___",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 4 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
      { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fidèles");

    const dateStr = new Date().toISOString().split("T")[0];
    const suffix = selected.size > 0 ? "selection" : "filtree";
    XLSX.writeFile(workbook, `fideles_${suffix}_${dateStr}.xlsx`);
  };

  const openDetail = (f) => { setDetailFidele(f); setEditData({ ...f }); setEditMode(false); setShowDeleteConfirm(false); };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/listeInscription/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setFideles(prev => prev.map(f => f.id === updated.id ? updated : f));
      setDetailFidele(updated);
      setEditMode(false);
      setToast({ message: "Fidèle mis à jour avec succès.", type: "success" });
    } catch {
      setToast({ message: "Erreur lors de la mise à jour.", type: "error" });
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/listeInscription/${detailFidele.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setFideles(prev => prev.filter(f => f.id !== detailFidele.id));
      setDetailFidele(null);
      setToast({ message: "Fidèle supprimé.", type: "info" });
    } catch {
      setToast({ message: "Erreur lors de la suppression.", type: "error" });
    }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Modal open={!!detailFidele} onClose={() => setDetailFidele(null)}
        title={editMode ? "Modifier le fidèle" : "Fiche du fidèle"} maxWidth="max-w-md">
        {detailFidele && !editMode && !showDeleteConfirm && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-500/20 border border-amber-100 dark:border-amber-700/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl font-bold font-serif shrink-0">
                {(detailFidele.nom || "?")[0]}
              </div>
              <div>
                <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg font-serif">{detailFidele.nom} {detailFidele.prenom}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${detailFidele.statut === "Actif" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>{detailFidele.statut}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(detailFidele).filter(([k]) => !["id"].includes(k)).map(([k, v]) => (
                <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-gray-400 text-xs capitalize mb-0.5">{k}</p>
                  <p className="text-gray-800 dark:text-gray-200 font-medium text-xs">{v || "—"}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditMode(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                <Icon name="edit" size={15} /> Modifier
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-sm font-semibold py-2.5 rounded-lg border border-red-200 dark:border-red-800/40 transition-colors">
                <Icon name="trash" size={15} /> Supprimer
              </button>
            </div>
          </div>
        )}
        {showDeleteConfirm && (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mx-auto"><Icon name="trash" size={26} /></div>
            <p className="text-gray-800 dark:text-gray-200 font-semibold">Supprimer ce fidèle ?</p>
            <p className="text-gray-500 text-sm">Cette action est irréversible. <strong>{detailFidele?.nom} {detailFidele?.prenom}</strong> sera définitivement supprimé(e).</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuler</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">Confirmer la suppression</button>
            </div>
          </div>
        )}
        {editMode && (
          <div className="space-y-3">
            {["nom","prenom","telephone","statut","services","baptise"].map(field => (
      <div key={field}>
        <label className="text-gray-500 text-xs font-medium mb-1 block capitalize">
          {field === "services" ? "Département" : field === "baptise" ? "Baptisé(e)" : field}
        </label>
        {field === "statut" ? (
          <select value={editData[field] || ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))} className={`w-full ${selectCls}`}>
            {[...new Set(fideles.map(f => f.statut).filter(Boolean))].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : field === "services" ? (
          <select value={editData[field] || ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))} className={`w-full ${selectCls}`}>
            {[...new Set(fideles.map(f => f.services).filter(Boolean))].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : field === "baptise" ? (
          <select value={editData[field] ?? ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))} className={`w-full ${selectCls}`}>
            <option value="">—</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </select>
        ) : (
          <input value={editData[field] || ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))} className={inputCls} />
        )}
      </div>
    ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditMode(false)} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuler</button>
              <button onClick={handleSaveEdit} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"><Icon name="check" size={15} /> Enregistrer</button>
            </div>
          </div>
        )}
      </Modal>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="search" size={16} /></div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un fidèle…" className={`${inputCls} pl-9`} />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className={selectCls}>
            {departements.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className={selectCls}>
            {statuts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-14 gap-3 text-gray-400"><Spinner />Chargement des fidèles…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300 accent-amber-500" />
                  </th>
                  <th className="text-left text-gray-500 dark:text-gray-400 font-medium px-4 py-3">Nom</th>
                  <th className="text-left text-gray-500 dark:text-gray-400 font-medium px-4 py-3">Prénom</th>
                  <th className="text-left text-gray-500 dark:text-gray-400 font-medium px-4 py-3 hidden sm:table-cell">Téléphone</th>
                  <th className="text-left text-gray-500 dark:text-gray-400 font-medium px-4 py-3">Département</th>
                  <th className="text-left text-gray-500 dark:text-gray-400 font-medium px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id} className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${selected.has(f.id) ? "bg-amber-50/60 dark:bg-amber-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/40"}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} className="rounded border-gray-300 accent-amber-500" /></td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{f.nom}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{f.prenom}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{f.telephone1}</td>
                    <td className="px-4 py-3"><span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-1 rounded-full">{f.services || "—"}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${f.statut === "Actif" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>{f.statut}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(f)}
                        className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 transition-colors">
                        <Icon name="plus" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">Aucun fidèle trouvé.</div>}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-gray-400 text-sm">
          {filtered.length} fidèle(s) affiché(s)
          {selected.size > 0 && <span className="ml-2 text-amber-600 font-medium">· {selected.size} sélectionné(s)</span>}
        </p>
        <div className="flex gap-2">
          <button onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
            <Icon name="download" size={15} />
            {selected.size > 0 ? `Excel (${selected.size})` : "Exporter en Excel"}
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
            <Icon name="print" size={15} />
            {selected.size > 0 ? `Imprimer la sélection (${selected.size})` : "Imprimer la liste filtrée"}
          </button>
        </div>
      </div>
    </div>
  );
};




// ─────────────────────────────────────────────
// TITRES DES SECTIONS
// ─────────────────────────────────────────────
const SECTION_TITLES = {
  dashboard: "Tableau de bord",
  announce:  "Annonces",
  manuel:    "Manuel d'étude",
  students:  "Fidèles"
};


//ecran de connexion
// ÉCRAN DE CONNEXION
// ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Identifiants incorrects.");
      } else {
        onLogin(data); // { token, role, nom, email }
      }
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
    } finally {
      setLoading(false);
    }
  };

  const loginInputCls = [
    "w-full rounded-lg px-4 py-3 text-sm transition-colors",
    "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400",
    "focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
    "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500",
    "dark:focus:ring-amber-900/40",
  ].join(" ");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Blobs décoratifs */}
      <div className="absolute w-80 h-80 rounded-full bg-amber-100 dark:bg-amber-900/20 blur-3xl -top-20 -right-20 pointer-events-none" />
      <div className="absolute w-64 h-64 rounded-full bg-orange-50 dark:bg-amber-800/10 blur-3xl -bottom-10 -left-10 pointer-events-none" />

      <div className="w-full max-w-sm z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-500/20 dark:border-amber-700/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-sm">
            <Icon name="church" size={26} />
          </div>
          <h1 className="text-gray-900 dark:text-gray-100 font-bold text-xl font-serif">EGC Brazzaville</h1>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Espace Administration</p>
        </div>

        {/* Card connexion */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl shadow-gray-200/60 dark:shadow-none">
          <h2 className="text-gray-900 dark:text-gray-100 font-semibold text-base mb-1 font-serif">Connexion</h2>
          <p className="text-gray-500 dark:text-gray-500 text-xs mb-6">Accès réservé aux administrateurs autorisés.</p>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                <Icon name="mail" size={12} /> Adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="admin@egc-brazza.cg"
                className={loginInputCls}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                <Icon name="lock" size={12} /> Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="••••••••"
                  className={`${loginInputCls} pr-11`}
                />
                <button
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <Icon name={showPwd ? "eyeOff" : "eye"} size={16} />
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-xs rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            {/* Bouton */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 dark:disabled:bg-amber-800 text-white font-semibold text-sm py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/>
                  </svg>
                  Connexion…
                </>
              ) : "Se connecter"}
            </button>
          </div>
        </div>

        <p className="text-gray-400 dark:text-gray-600 text-xs text-center mt-6">
          Pour toute demande d'accès, contactez le Pasteur Principal.
        </p>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────
// APP PRINCIPALE
// ─────────────────────────────────────────────
export default function AdminDashboard() {
  const { dark, toggle: toggleTheme } = useTheme();

  // ── Session persistante ──────────────────────
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("egc-user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [activeSection, setActiveSection] = useState(() => {
    if (!user) return null;
    const allowed = PERMISSIONS[user.role] || [];
    return allowed[0] || "dashboard";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
//controler l'activiter sur la page admin

useEffect(() => {
  if (!user) return;

  let timeout;

  const logoutForInactivity = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("egc-user");

    setUser(null);
    setActiveSection(null);
    setSidebarOpen(false);
  };

  const resetTimer = () => {
    clearTimeout(timeout);
    timeout = setTimeout(logoutForInactivity, SESSION_TIMEOUT);
  };

  const events = [
    "mousedown",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart",
    "click"
  ];

  events.forEach(event => {
    window.addEventListener(event, resetTimer);
  });

  resetTimer();

  return () => {
    clearTimeout(timeout);

    events.forEach(event => {
      window.removeEventListener(event, resetTimer);
    });
  };
}, [user]);

  // Charger la Bible dès le démarrage de l'app (cache IndexedDB)
  useEffect(() => {
    loadBible().catch((error) => {
      console.error("Impossible de précharger la Bible :", error);
    });
  }, []);

const handleLogin = useCallback((userData) => {
  localStorage.setItem("token", userData.token);
  localStorage.setItem("egc-user", JSON.stringify(userData));

  setUser(userData);

  const allowed = PERMISSIONS[userData.role] || [];
  setActiveSection(allowed[0] || "dashboard");
}, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("egc-user");
    setUser(null);
    setActiveSection(null);
    setSidebarOpen(false);
  }, []);

  const handleSelectSection = useCallback((id) => {
    if (user && canAccess(user.role, id)) setActiveSection(id);
  }, [user]);

  const renderSection = () => {
    if (!user || !activeSection) return null;
    if (!canAccess(user.role, activeSection)) return <AccessDenied />;
    switch (activeSection) {
      case "dashboard": return <SectionDashboard />;
      case "announce":  return <SectionAnnonce />;
      case "stats":     return <SectionStats />;
      case "manuel":    return <SectionManuel />;
      case "students":  return <SectionStudents />;
      case "live":      return <SectionLive />;
      case "admins":    return <SectionAdmins />;
      default:          return null;
    }
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex font-sans">
      <Sidebar
        active={activeSection}
        onSelect={handleSelectSection}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={SECTION_TITLES[activeSection] || ""}
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          dark={dark}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
