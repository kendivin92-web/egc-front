import { useState, useEffect, useCallback, useRef } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const createRequestKey = () => crypto.randomUUID();
// ── Google Fonts injection
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500&family=Caveat:wght@500&display=swap";
document.head.appendChild(fontLink);

// ── CSS keyframes & global styles
const globalStyles = `
  @keyframes drift {
    0%, 100% { transform: translate(0,0) rotate(0deg); }
    33% { transform: translate(20px,-15px) rotate(5deg); }
    66% { transform: translate(-10px,20px) rotate(-3deg); }
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(30px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes cardOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(-20px) scale(0.97); }
  }
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-6px)}
    40%{transform:translateX(6px)}
    60%{transform:translateX(-4px)}
    80%{transform:translateX(4px)}
  }
  @keyframes popIn {
    from { opacity:0; transform: scale(0.3); }
    to   { opacity:1; transform: scale(1); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(0.85); opacity: 0.6; }
    100% { transform: scale(1.45); opacity: 0; }
  }
  .blob-1 { animation: drift 18s ease-in-out infinite; }
  .blob-2 { animation: drift 22s ease-in-out infinite reverse; }
  .blob-3 { animation: drift 15s ease-in-out infinite 3s; }
  .card-enter { animation: cardIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both; }
  .card-leave { animation: cardOut 0.3s ease both; }
  .result-enter { animation: cardIn 0.6s cubic-bezier(0.34,1.3,0.64,1) both; }
  .circle-pop { animation: popIn 0.7s cubic-bezier(0.34,1.6,0.64,1) 0.2s both; }
  .input-shake { animation: shake 0.4s ease; }
  .progress-fill { transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
  .spinner { animation: spin 0.8s linear infinite; }
  .pulse-ring { animation: pulse-ring 1.5s ease-out infinite; }
`;

const isValidName = (name) => {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,}$/.test(name.trim());
};
const isOldEnough = (naissance) => {
  if (!naissance) return false;
  const today = new Date();
  const birth = new Date(naissance);

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 10;
};
// ── Données arrondissements
const arrData = {
  brazzaville: ["Makélékélé","Bacongo","Poto-Poto","Moungali","Ouenzé","Talangaï","Mfilou","Madibou","Djiri"],
  pointe_noire: ["Lumumba","Mvou-Mvou","Tié-Tié","Loandjili","Mongo-Mpoukou","Ngoyo"],
  dolisie: ["Centre-ville","Makayabou","Mvoula","Nikayi"],
  ouesso: ["Centre","Madiville","Ngombe","Pokola"],
  autre: [],
};

// ── Étapes du formulaire
const steps = [
  { id:"nom", tag:"Identité", q:"Quel est votre nom de famille ?", sub:"", type:"text", placeholder:"Ex : DELICAT", required:true },
  { id:"prenom", tag:"Identité", q:"Et votre prénom ?", sub:"Tel qu'il apparaît sur votre document officiel.", type:"text", placeholder:"Ex : Welcome Anderson", required:true },
  { id:"naissance", tag:"Identité", q:"Quelle est votre date de naissance ?", sub:"", type:"date", placeholder:"", required:true },
  { id:"adresse", tag:"Localisation", q:"Quelle est votre adresse ?", sub:"Adresse complète. Visible uniquement par l’administration pour le suivi des inscriptions.", type:"text", placeholder:"Ex : 06 rue mbongo makoundou", required:true },
  { id:"ville", tag:"Localisation", q:"Dans quelle ville habitez-vous ?", sub:"", type:"select", options:[
    {value:"brazzaville",label:"Brazzaville"},
    {value:"pointe_noire",label:"Pointe-Noire"},
    {value:"dolisie",label:"Dolisie"},
    {value:"ouesso",label:"Ouesso"},
    {value:"autre",label:"Autre ville"},
  ], required:true },
  { id:"arrondissement", tag:"Localisation", q:"Dans quel arrondissement ?", sub:"", type:"dynamic_arr", required:true, dependsOn:"ville" },
  { id:"telephone1", tag:"Contact", q:"Votre numéro de téléphone principal ?", sub:"Format conseillé : +242 06 000 0000", type:"tel", placeholder:"+242 06 000 0000", required:true },
  { id:"telephone2", tag:"Contact", q:"Un second numéro de téléphone ?", sub:"Optionnel — laissez vide si non applicable.", type:"tel", placeholder:"+242 05 000 0000", required:false },
  { id:"bapteme", tag:"Foi", q:"Êtes-vous baptisé(e) ?", sub:"Baptême par immersion totale.", type:"yn", required:true },
  { id:"statut", tag:"Engagement", q:"Quel est votre statut dans l'église ?", sub:"Choisissez celui qui vous correspond le mieux.", type:"choices", choices:["Assistant(e)","En service","En formation"], required:true },
  { id:"services", tag:"Service", q:"Dans quel département servez-vous  ?", sub:"Sélectionnez le département", type:"select", options:[
    {value:"Accueil",label:"Accueil"},{value:"Chantre",label:"Chantre/ Musique"},
    {value:"Sonorisation",label:"Sonorisation"},{value:"Sécurité",label:"Sécurité"},
    {value:"Logistique",label:"Logistique"},{value:"NTIC",label:"NTIC"},
    {value:"Administration",label:"Administration / Finance"},{value:"Traduction",label:"Traduction / Langues"},
  ], required:true, showIf:(ans) => ans.statut === "En service" },
];

const tagColors = {
  Identité:"#c8783a", Localisation:"#4a7c59", Contact:"#3a78c8",
  Foi:"#8a4ac8", Engagement:"#c84a7c", Membre:"#c89a3a",
};

const hintMap = {
  text:"Entrée ↵ pour continuer", tel:"Entrée ↵ pour continuer",
  date:"Sélectionnez et appuyez Continuer", select:"Choisissez et appuyez Continuer",
  dynamic_arr:"Choisissez et appuyez Continuer", choices:"Tapez pour sélectionner", yn:"Tapez pour répondre",
};

const selectArrowBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%239e9080' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 1.1rem center`;

// ── SVGs
const ChevronLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─────────────────────────────────────────────
//  ÉCRAN DE CHARGEMENT
// ─────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="result-enter" style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
      <div style={{ position:"relative", width:90, height:90, marginBottom:"1.8rem" }}>
        <div className="pulse-ring" style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid #c8783a" }}/>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg className="spinner" width="58" height="58" viewBox="0 0 58 58" fill="none">
            <circle cx="29" cy="29" r="24" stroke="#e8e0d0" strokeWidth="4"/>
            <path d="M29 5 A24 24 0 0 1 53 29" stroke="#c8783a" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem", color:"#c8783a" }}>✝</div>
      </div>
      <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"clamp(1.2rem, 4vw, 1.55rem)", fontWeight:500, color:"#1a1410", marginBottom:"0.5rem", lineHeight:1.3 }}>
        Enregistrement en cours…
      </div>
      <div style={{ color:"#9e9080", fontSize:"0.85rem", fontWeight:300 }}>
        Veuillez patienter quelques instants.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ÉCRAN DE RÉSULTAT
// ─────────────────────────────────────────────
function ResultScreen({ status, answers, onRestart, onRetry }) {
  const cfg = {
    success: {
      emoji:"🙏", circleBg:"#e0ede4",
      title:"Demande enregistrée !",
      sub:<>Merci <strong>{answers.prenom||""} {answers.nom||""}</strong>.<br/>Votre fiche a bien été reçue et reste en attente de validation par l’administration.</>,
      btn:{ label:"Nouvel enregistrement", bg:"#c8783a", action:onRestart },
    },
    duplicate: {
      emoji:"⚠️", circleBg:"#fef3c7",
      title:"Identifiant déjà enregistré",
      sub:<>Un dossier existe déjà pour <strong>{answers.prenom||""} {answers.nom||""}</strong> avec ce numéro de téléphone.<br/>Veuillez vérifier vos informations.</>,
      btn:{ label:"Modifier mes informations", bg:"#c89a3a", action:onRestart },
    },
    error: {
      emoji:"✕", circleBg:"#fde8e8", emojiColor:"#c84040",
      title:"Échec de l'enregistrement",
      sub:"Une erreur est survenue lors de la transmission. Vérifiez votre connexion et réessayez.",
      btn:{ label:"Réessayer", bg:"#c84040", action:onRetry },
      secondary:{ label:"Recommencer", action:onRestart },
    },
  }[status];

  if (!cfg) return null;

  return (
    <div className="result-enter" style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
      <div className="circle-pop" style={{ width:90, height:90, background:cfg.circleBg, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize: status === "error" ? "1.8rem" : "2.5rem", fontWeight: status === "error" ? 700 : "normal", color: cfg.emojiColor || "inherit", marginBottom:"1.5rem" }}>
        {cfg.emoji}
      </div>
      <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"clamp(1.4rem, 5vw, 1.9rem)", fontWeight:700, color:"#1a1410", marginBottom:"0.6rem", lineHeight:1.3 }}>
        {cfg.title}
      </div>
      <div style={{ color:"#9e9080", fontSize:"0.95rem", lineHeight:1.65, maxWidth:340, marginBottom:"2rem" }}>
        {cfg.sub}
      </div>
      <button onClick={cfg.btn.action}
        style={{ padding:"0.85rem 2.2rem", background:cfg.btn.bg, color:"#fff", border:"none", borderRadius:100, fontFamily:"'DM Sans', sans-serif", fontSize:"0.92rem", fontWeight:500, cursor:"pointer", transition:"all 0.2s", letterSpacing:"0.03em", marginBottom: cfg.secondary ? "0.75rem" : 0 }}
        onMouseEnter={e => { e.currentTarget.style.opacity="0.85"; e.currentTarget.style.transform="translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}
      >
        {cfg.btn.label}
      </button>
      {cfg.secondary && (
        <button onClick={cfg.secondary.action}
          style={{ padding:"0.65rem 1.8rem", background:"transparent", color:"#9e9080", border:"2px solid #e8e0d0", borderRadius:100, fontFamily:"'DM Sans', sans-serif", fontSize:"0.85rem", fontWeight:500, cursor:"pointer", transition:"all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#9e9080"; e.currentTarget.style.color="#4a4035"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="#e8e0d0"; e.currentTarget.style.color="#9e9080"; }}
        >
          {cfg.secondary.label}
        </button>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────
export default function InscriptionEGC() {
  const [answers, setAnswers]         = useState({});
  const [history, setHistory]         = useState([]);
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [cardKey, setCardKey]         = useState(0);
  const [leaving, setLeaving]         = useState(false);
  const [inputError, setInputError] = useState(false);
  const [toast, setToast] = useState("");
  // null | "loading" | "success" | "duplicate" | "error"
  const [submitStatus, setSubmitStatus] = useState(null);
  const inputRef = useRef(null);

  
//messsage d'erreur
const showToast = (message) => {
  setToast(message);

  setTimeout(() => {
    setToast("");
  }, 2500);
};
  // Inject styles once
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = globalStyles;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  const getVisibleSteps = useCallback((ans = answers) =>
    steps.filter(s => !s.showIf || s.showIf(ans))
  , [answers]);

  const visibleSteps = getVisibleSteps();
  const totalSteps   = visibleSteps.length;
  const currentStep  = visibleSteps[currentIdx];
  const isDone       = submitStatus !== null;
  const progress     = isDone ? 100 : (currentIdx / totalSteps) * 100;
  const hint         = currentStep ? hintMap[currentStep.type] || "" : "";
  const showBack     = history.length > 0 && !isDone;

  // Focus input
  useEffect(() => {
    if (!isDone && inputRef.current && currentStep) {
      const t = setTimeout(() => {
        if (inputRef.current && ["text","tel","date","select"].includes(currentStep.type))
          inputRef.current.focus();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [cardKey, isDone, currentStep]);


const setValue = (val) => {
  let cleanVal = val;

  if (currentStep.id === "nom") {
    cleanVal = val.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, "").toUpperCase();
  }

  if (currentStep.id === "prenom") {
    cleanVal = val
      .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, "")
      .replace(/(^|\s)\S/g, L => L.toUpperCase());
  }

  if (currentStep.id === "telephone1" || currentStep.id === "telephone2") {
  cleanVal = val.replace(/[^0-9+]/g, "");

  // Garder un seul + au début
  if (cleanVal.includes("+")) {
    cleanVal = "+" + cleanVal.replace(/\+/g, "");
  }

  // Limiter à 12 chiffres (hors signe +)
  const prefix = cleanVal.startsWith("+") ? "+" : "";
  const numbers = cleanVal.replace(/\+/g, "").slice(0, 12);

  cleanVal = prefix + numbers;
}


  // 🔥 Correction : changement de ville = suppression de l'ancien arrondissement
  if (currentStep.id === "ville") {
    setAnswers(prev => ({
      ...prev,
      ville: cleanVal,
      arrondissement: ""
    }));
    return;
  }


  setAnswers(prev => ({
    ...prev,
    [currentStep.id]: cleanVal
  }));
};
  const triggerLeave = (cb) => {
    setLeaving(true);
    setTimeout(() => { setLeaving(false); cb(); }, 280);
  };
const sendingRef = useRef(false);
const requestKeyRef = useRef(null);
  // ── Soumission API
const submitToServer = async (finalAnswers) => {

  if (sendingRef.current) return;
  sendingRef.current = true;
  requestKeyRef.current ??= createRequestKey();

  // Animation de sortie de la carte (juste visuelle)
  setLeaving(true);
  setTimeout(() => setLeaving(false), 280);

  // On passe en "loading" TOUT DE SUITE, sans attendre l'animation
  setSubmitStatus("loading");

  try {
    const res = await fetch(API + "/api/inscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": requestKeyRef.current,
      },
      body: JSON.stringify(finalAnswers),
    });

    const data = await res.json();

    if (res.ok) {
      setSubmitStatus("success");
    } else if (res.status === 409) {
      setSubmitStatus("duplicate");
    } else {
      console.error("Registration request rejected:", data.message || res.status);
      setSubmitStatus("error");
    }

  } catch (error) {
    console.error(error);
    sendingRef.current = false;
    setSubmitStatus("error");
  }
};

  const advance = useCallback((overrideVal) => {
    if (submitStatus) return;

  if (!currentStep) return;
    if (!currentStep) return;
    const val = overrideVal !== undefined ? overrideVal : (answers[currentStep.id] || "");

    // ── Validation générale
if (currentStep.required && !val) {
  setInputError(true);
  setTimeout(() => setInputError(false), 600);
  return;
}

// ── Validation NOM
if (currentStep.id === "nom" && !isValidName(val)) {
  setInputError(true);
  showToast("Le nom doit contenir plus de 3 caracteres.");
  return;
}

// ── Validation PRÉNOM
if (currentStep.id === "prenom" && !isValidName(val)) {
  setInputError(true);
  showToast("Le prénom doit contenir plus de 3 caracteres");
  return;
}

// ── Validation ÂGE
if (currentStep.id === "naissance" && !isOldEnough(val)) {
  setInputError(true);
  showToast("Vous devez avoir au moins 10 ans.");
  return;
}

// 📞 Validation téléphone
if ((currentStep.id === "telephone1" || currentStep.id === "telephone2") && val) {
  const phoneDigits = val.replace(/\D/g, "");
  const phoneFormatIsValid = /^\+?[\d\s().-]+$/.test(val);

  if (!phoneFormatIsValid || phoneDigits.length < 8 || phoneDigits.length > 12) {
    setInputError(true);
    showToast("Numéro invalide. Utilisez 8 à 12 chiffres, avec l’indicatif si nécessaire.");
    return;
  }
}

    const newAnswers = { ...answers, [currentStep.id]: val };
    setAnswers(newAnswers);
    setHistory(prev => [...prev, currentIdx]);

    const newVisible = steps.filter(s => !s.showIf || s.showIf(newAnswers));
    if (currentIdx + 1 >= newVisible.length) {
      submitToServer(newAnswers);
    } else {
      triggerLeave(() => { setCurrentIdx(currentIdx + 1); setCardKey(k => k + 1); });
    }
  }, [currentStep, answers, currentIdx,submitStatus]);

  const goBack = () => {
  if (!showBack) return;

  const prev = history[history.length - 1]; 

  // Nettoyer l'arrondissement lorsqu'on revient sur la ville
  if (currentStep.id === "arrondissement") {
    setAnswers(prev => ({
      ...prev,
      arrondissement: ""
    }));
  }

  setHistory(h => h.slice(0, -1));

  triggerLeave(() => { 
    setCurrentIdx(prev); 
    setCardKey(k => k + 1); 
  });
};

  const restartForm = () => {

  sendingRef.current = false;
  requestKeyRef.current = null;

  setAnswers({});
  setHistory([]);
  setCurrentIdx(0);
  setCardKey(k => k + 1);
  setSubmitStatus(null);

};

  const handleAutoAdvance = (val) => {
    setAnswers(prev => ({ ...prev, [currentStep.id]: val }));
    setTimeout(() => advance(val), 350);
  };

  const tc     = currentStep ? (tagColors[currentStep.tag] || "#c8783a") : "#c8783a";
  const isLast = currentIdx === totalSteps - 1;

  
  // Keyboard Enter
useEffect(() => {
  const h = (e) => {

    if (submitStatus) return;

    if (
      e.key === "Enter" &&
      currentStep &&
      !["choices", "yn"].includes(currentStep.type)
    ) {
      advance();
    }
  };

  window.addEventListener("keydown", h);

  return () => {
    window.removeEventListener("keydown", h);
  };

}, [currentStep, advance, submitStatus]);
  // Shared input style helpers
  const baseInputStyle = (error=false) => ({
    width:"100%", background: error ? "#fde8e8" : "#f2ede4",
    border: error ? "2px solid #c84040" : "2px solid transparent",
    borderRadius:14, padding:"1rem 1.2rem",
    fontFamily:"'DM Sans', sans-serif", fontSize:"1rem", color:"#1a1410",
    outline:"none", WebkitAppearance:"none", appearance:"none",
    boxShadow: error ? "0 0 0 4px rgba(200,64,64,0.1)" : "none",
    transition:"all 0.25s",
  });
  const focusIn  = e => { e.target.style.borderColor="#c8783a"; e.target.style.background="#fff"; e.target.style.boxShadow="0 0 0 4px #f5e6d3"; };
  const focusOut = e => { e.target.style.borderColor="transparent"; e.target.style.background="#f2ede4"; e.target.style.boxShadow="none"; };

  return (
    <div style={{ fontFamily:"'DM Sans', sans-serif", background:"#faf8f4", color:"#1a1410", height:"100dvh", overflow:"hidden", position:"relative" }}>

      {/* Blobs */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden"  }}>
        <div className="blob-1" style={{ position:"absolute", width:500, height:400, background:"#f5d4a8", top:-100, right:-100, borderRadius:"60% 40% 70% 30% / 50% 60% 40% 50%", opacity:0.55, filter:"blur(60px)" }}/>
        <div className="blob-2" style={{ position:"absolute", width:400, height:350, background:"#c8e6d8", bottom:-80, left:-80, borderRadius:"60% 40% 70% 30% / 50% 60% 40% 50%", opacity:0.55, filter:"blur(60px)" }}/>
        <div className="blob-3" style={{ position:"absolute", width:250, height:200, background:"#fce4c8", top:"40%", left:"20%", borderRadius:"60% 40% 70% 30% / 50% 60% 40% 50%", opacity:0.55, filter:"blur(60px)" }}/>
      </div>

      {/* Progress bar */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:3, background:"#e8e0d0", zIndex:100 }}>
        <div className="progress-fill" style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg, #c8783a, #e8a060)", borderRadius:"0 2px 2px 0" }}/>
      </div>


      {/* ── Bouton Retour — visible avec carte blanche et bordure */}
      <button
        onClick={goBack}
        style={{
          position:"fixed", top:"0.8rem", left:"1rem",
          background: showBack ? "#ffffff" : "transparent",
          border: showBack ? "1.5px solid #e8e0d0" : "1.5px solid transparent",
          cursor: showBack ? "pointer" : "default",
          color: "#4a4035",
          fontSize:"0.8rem", fontFamily:"'DM Sans', sans-serif",
          display:"flex", alignItems:"center", gap:"0.35rem",
          zIndex:100, padding:"0.45rem 0.9rem 0.45rem 0.7rem",
          borderRadius:20, fontWeight:500,
          opacity: showBack ? 1 : 0,
          pointerEvents: showBack ? "auto" : "none",
          transition:"all 0.25s",
          boxShadow: showBack ? "0 2px 10px rgba(26,20,16,0.1)" : "none",
          marginTop : "80px"
          
        }}
        onMouseEnter={e => { e.currentTarget.style.background="#f2ede4"; e.currentTarget.style.borderColor="#c8783a"; e.currentTarget.style.color="#c8783a"; }}
        onMouseLeave={e => { e.currentTarget.style.background="#ffffff"; e.currentTarget.style.borderColor="#e8e0d0"; e.currentTarget.style.color="#4a4035"; }}
      >
        <ChevronLeft /> Retour
      </button>

      {/* Step counter */}
      {!isDone && (
        <div style={{ position:"fixed", top:"1.2rem", right:"1.5rem", fontSize:"0.75rem", fontWeight:500, color:"#9e9080", letterSpacing:"0.05em", zIndex:100, marginTop:"80px" }}>
          <span style={{ color:"#c8783a", fontWeight:600 }}>{currentIdx + 1}</span> / {totalSteps}
        </div>
      )}

      {/* Main */}
      <div style={{ position:"relative", zIndex:1, height:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"1.5rem" }}>
        <div style={{ width:"100%", maxWidth:560, position:"relative" }}>

          {/* Loading */}
          {submitStatus === "loading" && <LoadingScreen />}

          {/* Result */}
          {["success","duplicate","error"].includes(submitStatus) && (
            <ResultScreen
              status={submitStatus}
              answers={answers}
              onRestart={restartForm}
              onRetry={() => submitToServer(answers)}
            />
          )}

          {/* Question card */}
          {!isDone && currentStep && (
            <div key={cardKey} className={leaving ? "card-leave" : "card-enter"}
              style={{ background:"#ffffff", borderRadius:24, boxShadow:"0 4px 6px rgba(26,20,16,0.08), 0 20px 60px rgba(26,20,16,0.14)", padding:"2.5rem 2.5rem 2rem", position:"relative", overflow:"hidden" }}
            >
              {/* Top gradient */}
              <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:"linear-gradient(90deg, #c8783a, #e8b070, #c8783a)" }}/>

              {/* Tag */}
              <div style={{ display:"inline-flex", alignItems:"center", gap:"0.35rem", fontSize:"0.68rem", fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:tc, background:`${tc}18`, padding:"0.3rem 0.75rem", borderRadius:100, marginBottom:"1.4rem" }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:tc, display:"inline-block" }}/>
                {currentStep.tag}
              </div>

              {/* Question text */}
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"clamp(1.3rem, 4vw, 1.75rem)", fontWeight:500, lineHeight:1.35, color:"#1a1410", marginBottom:"0.5rem" }}>
                {currentStep.q}
              </div>
              {currentStep.sub
                ? <div style={{ fontSize:"0.85rem", color:"#9e9080", marginBottom:"1.8rem", fontWeight:300, lineHeight:1.5 }}>{currentStep.sub}</div>
                : <div style={{ marginBottom:"1.8rem" }}/>
              }

              {/* text / tel / date */}
              {["text","tel","date"].includes(currentStep.type) && (
                <>
                  <input ref={inputRef} type={currentStep.type}
                    placeholder={currentStep.placeholder || ""}
                    value={answers[currentStep.id] || ""}
                    onChange={e => setValue(e.target.value)}
                    className={inputError ? "input-shake" : ""}
                    style={baseInputStyle(inputError)}
                    onFocus={focusIn} onBlur={e => { if (!inputError) focusOut(e); }}
                  />
                  {!currentStep.required && (
                    <div style={{ fontSize:"0.75rem", color:"#9e9080", marginTop:"0.5rem" }}>Facultatif</div>
                  )}
                </>
              )}

              {/* select */}
              {currentStep.type === "select" && (
                <select ref={inputRef} value={answers[currentStep.id] || ""} onChange={e => setValue(e.target.value)}
                  style={{ ...baseInputStyle(), background:`#f2ede4 ${selectArrowBg}`, padding:"1rem 3rem 1rem 1.2rem", cursor:"pointer" }}
                  onFocus={e => { e.target.style.borderColor="#c8783a"; e.target.style.background=`#fff ${selectArrowBg}`; e.target.style.boxShadow="0 0 0 4px #f5e6d3"; }}
                  onBlur={e => { e.target.style.borderColor="transparent"; e.target.style.background=`#f2ede4 ${selectArrowBg}`; e.target.style.boxShadow="none"; }}
                >
                  <option value="">— Choisir —</option>
                  {currentStep.options.map(o => <option key={o.value} value={o.value} style={{ background:"#fff" }}>{o.label}</option>)}
                </select>
              )}

              {/* dynamic_arr */}
              {currentStep.type === "dynamic_arr" && (() => {
                const arr = arrData[answers.ville];
                if (!arr || arr.length === 0) return (
                  <input ref={inputRef} type="text" placeholder="Votre arrondissement..."
                    value={answers[currentStep.id] || ""} onChange={e => setValue(e.target.value)}
                    style={baseInputStyle()} onFocus={focusIn} onBlur={focusOut}
                  />
                );
                return (
                  <select ref={inputRef} value={answers[currentStep.id] || ""} onChange={e => setValue(e.target.value)}
                    style={{ ...baseInputStyle(), background:`#f2ede4 ${selectArrowBg}`, padding:"1rem 3rem 1rem 1.2rem", cursor:"pointer" }}
                    onFocus={e => { e.target.style.borderColor="#c8783a"; e.target.style.background=`#fff ${selectArrowBg}`; e.target.style.boxShadow="0 0 0 4px #f5e6d3"; }}
                    onBlur={e => { e.target.style.borderColor="transparent"; e.target.style.background=`#f2ede4 ${selectArrowBg}`; e.target.style.boxShadow="none"; }}
                  >
                    <option value="">— Sélectionner —</option>
                    {arr.map(a => <option key={a} value={a} style={{ background:"#fff" }}>{a}</option>)}
                  </select>
                );
              })()}

              {/* choices */}
              {currentStep.type === "choices" && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:"0.6rem", marginBottom:"0.5rem" }}>
                  {currentStep.choices.map(c => {
                    const sel = (answers[currentStep.id] || "") === c;
                    return (
                      <button key={c} onClick={() => handleAutoAdvance(c)}
                        style={{ padding:"0.65rem 1.2rem", borderRadius:100, border: sel ? "2px solid #c8783a" : "2px solid #e8e0d0", background: sel ? "#c8783a" : "#f2ede4", cursor:"pointer", fontSize:"0.9rem", fontWeight:500, color: sel ? "#fff" : "#4a4035", boxShadow: sel ? "0 4px 16px rgba(200,120,58,0.35)" : "none", transform: sel ? "scale(1.04)" : "scale(1)", transition:"all 0.2s cubic-bezier(0.34,1.3,0.64,1)", userSelect:"none", whiteSpace:"nowrap" }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor="#e8c49a"; e.currentTarget.style.background="#f5e6d3"; e.currentTarget.style.transform="scale(1.03)"; }}}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor="#e8e0d0"; e.currentTarget.style.background="#f2ede4"; e.currentTarget.style.transform="scale(1)"; }}}
                      >{c}</button>
                    );
                  })}
                </div>
              )}

              {/* yn */}
              {currentStep.type === "yn" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem" }}>
                  {[{value:"oui",icon:"✓",label:"Oui"},{value:"non",icon:"×",label:"Non"}].map(opt => {
                    const sel = (answers[currentStep.id] || "") === opt.value;
                    const isOui = opt.value === "oui";
                    return (
                      <button key={opt.value} onClick={() => handleAutoAdvance(opt.value)}
                        style={{ padding:"1rem", borderRadius:16, border: sel ? `2px solid ${isOui?"#4a7c59":"#c84040"}` : "2px solid #e8e0d0", background: sel ? (isOui?"#e0ede4":"#fde8e8") : "#f2ede4", cursor:"pointer", fontSize:"1rem", fontWeight:500, color: sel ? (isOui?"#4a7c59":"#c84040") : "#4a4035", display:"flex", flexDirection:"column", alignItems:"center", gap:"0.3rem", boxShadow: sel ? (isOui?"0 4px 16px rgba(74,124,89,0.25)":"0 4px 16px rgba(200,64,64,0.2)") : "none", transform: sel ? "translateY(-2px)" : "translateY(0)", transition:"all 0.22s cubic-bezier(0.34,1.3,0.64,1)" }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(26,20,16,0.08)"; }}}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}}
                      >
                        <span style={{ fontSize:"1.5rem" }}>{opt.icon}</span>{opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bouton Continuer / Soumettre */}
              {!["choices","yn"].includes(currentStep.type) && (
                <NextButton isLast={isLast} onClick={() => advance()} />
              )}
            </div>
          )}
        </div>

        {/* Hint */}
        {!isDone && (
          <div style={{ textAlign:"center", marginTop:"1rem", fontFamily:"'Caveat', cursive", fontSize:"1.05rem", color:"#9e9080", opacity:0.8, transition:"opacity 0.3s" }}>
            {hint}
          </div>
        )}
      </div>
      {toast && (
  <div
    style={{
      position:"fixed",
      top:"1.5rem",
      left:"50%",
      transform:"translateX(-50%)",
      background:"#c84040",
      color:"#fff",
      padding:"0.8rem 1.4rem",
      borderRadius:100,
      fontFamily:"'DM Sans', sans-serif",
      fontSize:"0.9rem",
      boxShadow:"0 8px 25px rgba(0,0,0,0.15)",
      zIndex:999,
      animation:"popIn 0.3s ease both",
      maxWidth:"90%",
      textAlign:"center"
    }}
  >
    ⚠️ {toast}
  </div>
)}
    </div>
  );
}

function NextButton({ isLast, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ marginTop:"1.6rem", width:"100%", padding:"1rem", background: hovered ? "#c8783a" : "#1a1410", color:"#fff", border:"none", borderRadius:14, fontFamily:"'DM Sans', sans-serif", fontSize:"1rem", fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.6rem", transition:"all 0.22s", letterSpacing:"0.02em", position:"relative", overflow:"hidden", transform: hovered ? "translateY(-1px)" : "translateY(0)", boxShadow: hovered ? "0 8px 24px rgba(200,120,58,0.35)" : "none" }}
    >
      <span style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(255,255,255,0.1), transparent)", pointerEvents:"none" }}/>
      {isLast ? "Soumettre" : "Continuer"}
      {isLast ? <CheckIcon /> : <ChevronRight />}
    </button>
  );
}
