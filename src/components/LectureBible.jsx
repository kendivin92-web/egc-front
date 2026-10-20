import React, { useState, useMemo } from "react";
import bibleData from "./segond_1910.json";
export default function LectureBible({ dark }) {
  // Navigation
  const [selectedTab, setSelectedTab] = useState("bible");
  const [selectedTestament, setSelectedTestament] = useState(null); // 'ancien' ou 'nouveau'
  const [selectedBook, setSelectedBook] = useState(null); // Nom du livre
  const [selectedChapter, setSelectedChapter] = useState(null); // Numéro du chapitre
  // Vue Agrandie & Favoris (Chargement direct depuis le localStorage)
  const [selectedVerseIndex, setSelectedVerseIndex] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("egc_bible_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [copied, setCopied] = useState(false);
  // --- 1. EXTRACTION SÉCURISÉE DU TABLEAU DE VERSETS ---
  const rawVersesList = useMemo(() => {
    if (!bibleData) return [];
    if (Array.isArray(bibleData)) return bibleData;
    if (Array.isArray(bibleData.verses)) return bibleData.verses;
    if (Array.isArray(bibleData.versets)) return bibleData.versets;
    if (Array.isArray(bibleData.data)) return bibleData.data;
    if (Array.isArray(bibleData.result)) return bibleData.result;
    return [];
  }, []);
  // --- 2. REGROUPEMENT AUTOMATIQUE PAR LIVRES ---
  const booksMap = useMemo(() => {
    const map = {};
    rawVersesList.forEach((item) => {
      const bName =
        item.book_name ||
        item.book ||
        item.livre ||
        item.nom_livre ||
        "Inconnu";
      if (!map[bName]) {
        map[bName] = {};
      }
      const cNum = item.chapter || item.chapitre || 1;
      if (!map[bName][cNum]) {
        map[bName][cNum] = [];
      }
      map[bName][cNum].push({
        verse: item.verse || item.verset || map[bName][cNum].length + 1,
        text: item.text || item.texte || item.content || "",
      });
    });
    return map;
  }, [rawVersesList]);
  // Noms de tous les livres uniques
  const allBookNames = useMemo(() => Object.keys(booksMap), [booksMap]);
  // Séparation 39 livres (Ancien) et 27 livres (Nouveau)
  const ancienBooks = useMemo(() => allBookNames.slice(0, 39), [allBookNames]);
  const nouveauBooks = useMemo(() => allBookNames.slice(39), [allBookNames]);
  const currentBooksList =
    selectedTestament === "ancien"
      ? ancienBooks
      : selectedTestament === "nouveau"
      ? nouveauBooks
      : [];
  // Chapitres du livre sélectionné
  const currentChaptersList = useMemo(() => {
    if (!selectedBook || !booksMap[selectedBook]) return [];
    return Object.keys(booksMap[selectedBook]).sort((a, b) => Number(a) - Number(b));
  }, [selectedBook, booksMap]);
  // Versets du chapitre sélectionné
  const currentVerses = useMemo(() => {
    if (
      !selectedBook ||
      !selectedChapter ||
      !booksMap[selectedBook] ||
      !booksMap[selectedBook][selectedChapter]
    ) {
      return [];
    }
    return booksMap[selectedBook][selectedChapter];
  }, [selectedBook, selectedChapter, booksMap]);
  const currentVerse =
    selectedVerseIndex !== null && currentVerses[selectedVerseIndex]
      ? currentVerses[selectedVerseIndex]
      : null;
  // Actions
  const handleCopy = (text, ref) => {
    navigator.clipboard.writeText(`${ref} - "${text}"`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleShare = async (text, ref) => {
    const shareText = `${ref} - "${text}"`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Verset EGC", text: shareText });
      } catch (err) {
        console.log("Partage annulé", err);
      }
    } else {
      handleCopy(text, ref);
    }
  };
  // Gestion des favoris avec persistance dans le localStorage
  const toggleFavorite = (ref, text) => {
    const exists = favorites.find((f) => f.ref === ref);
    let updatedFavorites;
    if (exists) {
      updatedFavorites = favorites.filter((f) => f.ref !== ref);
    } else {
      updatedFavorites = [...favorites, { ref, text }];
    }
    setFavorites(updatedFavorites);
    try {
      localStorage.setItem("egc_bible_favorites", JSON.stringify(updatedFavorites));
    } catch (e) {
      console.error("Erreur de sauvegarde des favoris", e);
    }
  };
  return (
    <div
      style={{
        padding: "16px",
        color: dark ? "#ffffff" : "#1f2937",
        maxWidth: "600px",
        margin: "0 auto",
        paddingBottom: "120px",
      }}
    >
      {/* Onglets haut : Bible vs Favoris */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          backgroundColor: dark ? "#1f2937" : "#e5e7eb",
          padding: "4px",
          borderRadius: "10px",
        }}
      >
        <button
          onClick={() => setSelectedTab("bible")}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: selectedTab === "bible" ? "#2563eb" : "transparent",
            color: selectedTab === "bible" ? "#ffffff" : dark ? "#d1d5db" : "#374151",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          📖 Sainte Bible
        </button>
        <button
          onClick={() => setSelectedTab("favoris")}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: selectedTab === "favoris" ? "#2563eb" : "transparent",
            color: selectedTab === "favoris" ? "#ffffff" : dark ? "#d1d5db" : "#374151",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ❤️ Mes Favoris ({favorites.length})
        </button>
      </div>
      {/* --- ONGLET FAVORIS --- */}
      {selectedTab === "favoris" && (
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
            Versets mémorisés
          </h2>
          {favorites.length === 0 ? (
            <p style={{ color: dark ? "#9ca3af" : "#6b7280", textAlign: "center", marginTop: "40px" }}>
              Aucun verset enregistré. Cliquez sur le cœur ❤️ sur un verset pour l'ajouter ici !
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {favorites.map((fav, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: dark ? "#1f2937" : "#f9fafb",
                    border: dark ? "1px solid #374151" : "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: "bold", color: "#d97706", fontSize: "14px" }}>
                      {fav.ref}
                    </span>
                    <button
                      onClick={() => toggleFavorite(fav.ref, fav.text)}
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      ❌
                    </button>
                  </div>
                  <p style={{ margin: "0 0 10px 0", fontSize: "14px", lineHeight: "1.5" }}>
                    "{fav.text}"
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleCopy(fav.text, fav.ref)}
                      style={{ padding: "6px 10px", borderRadius: "6px", border: "none", fontSize: "12px", cursor: "pointer" }}
                    >
                      📋 Copier
                    </button>
                    <button
                      onClick={() => handleShare(fav.text, fav.ref)}
                      style={{ padding: "6px 10px", borderRadius: "6px", border: "none", fontSize: "12px", cursor: "pointer" }}
                    >
                      🔗 Partager
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* --- ONGLET BIBLE --- */}
      {selectedTab === "bible" && (
        <>
          {/* VUE 1 : Testaments */}
          {!selectedTestament && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: dark ? "#9ca3af" : "#6b7280", marginBottom: "20px" }}>
                Choisissez un testament pour commencer votre lecture
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <button
                  onClick={() => setSelectedTestament("ancien")}
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    border: dark ? "1px solid #374151" : "1px solid #e5e7eb",
                    backgroundColor: dark ? "#1f2937" : "#f3f4f6",
                    color: dark ? "#ffffff" : "#1f2937",
                    fontSize: "17px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  📜 Ancien Testament ({ancienBooks.length} livres)
                </button>
                <button
                  onClick={() => setSelectedTestament("nouveau")}
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    border: dark ? "1px solid #374151" : "1px solid #e5e7eb",
                    backgroundColor: dark ? "#1f2937" : "#f3f4f6",
                    color: dark ? "#ffffff" : "#1f2937",
                    fontSize: "17px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  ✨ Nouveau Testament ({nouveauBooks.length} livres)
                </button>
              </div>
            </div>
          )}
          {/* VUE 2 : Liste des Livres */}
          {selectedTestament && !selectedBook && (
            <div>
              <button
                onClick={() => setSelectedTestament(null)}
                style={{ marginBottom: "16px", background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "bold" }}
              >
                ← Choisir un autre testament
              </button>
              <h3 style={{ textAlign: "center", marginBottom: "16px" }}>
                {selectedTestament === "ancien" ? "Ancien Testament" : "Nouveau Testament"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                {currentBooksList.map((bookName, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedBook(bookName)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: dark ? "1px solid #374151" : "1px solid #e5e7eb",
                      backgroundColor: dark ? "#1f2937" : "#f9fafb",
                      color: dark ? "#ffffff" : "#1f2937",
                      fontSize: "14px",
                      fontWeight: "500",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    📖 {bookName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* VUE 3 : Liste des Chapitres */}
          {selectedBook && !selectedChapter && (
            <div>
              <button
                onClick={() => setSelectedBook(null)}
                style={{ marginBottom: "16px", background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "bold" }}
              >
                ← Retour aux livres
              </button>
              <h3 style={{ textAlign: "center", marginBottom: "16px" }}>
                {selectedBook} - Chapitres
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
                {currentChaptersList.map((chapNum) => (
                  <button
                    key={chapNum}
                    onClick={() => setSelectedChapter(chapNum)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: dark ? "1px solid #374151" : "1px solid #e5e7eb",
                      backgroundColor: dark ? "#1f2937" : "#f9fafb",
                      color: dark ? "#ffffff" : "#1f2937",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    {chapNum}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* VUE 4 : Versets du Chapitre */}
          {selectedChapter && (
            <div>
              <button
                onClick={() => setSelectedChapter(null)}
                style={{ marginBottom: "16px", background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "bold" }}
              >
                ← Retour aux chapitres
              </button>
              <h3 style={{ textAlign: "center", color: "#d97706", marginBottom: "16px" }}>
                {selectedBook} - Chapitre {selectedChapter}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {currentVerses.map((vObj, idx) => {
                  const ref = `${selectedBook} ${selectedChapter}:${vObj.verse}`;
                  const isFav = favorites.some((f) => f.ref === ref);
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedVerseIndex(idx)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        padding: "12px",
                        borderRadius: "10px",
                        backgroundColor:
                          selectedVerseIndex === idx
                            ? dark
                              ? "#374151"
                              : "#e0e7ff"
                            : dark
                            ? "#1f2937"
                            : "#f9fafb",
                        border: dark ? "1px solid #374151" : "1px solid #e5e7eb",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", gap: "10px", flex: 1 }}>
                        <span
                          style={{
                            backgroundColor: "#d97706",
                            color: "#fff",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            height: "fit-content",
                          }}
                        >
                          {vObj.verse}
                        </span>
                        <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
                          {vObj.text}
                        </p>
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(ref, vObj.text);
                        }}
                        style={{ fontSize: "18px", cursor: "pointer", padding: "4px" }}
                      >
                        {isFav ? "❤️" : "🤍"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {/* --- VUE AGRANDIE (MOITIÉ ÉCRAN) --- */}
      {currentVerse && selectedChapter && (
        <div
          style={{
            position: "fixed",
            bottom: "60px",
            left: 0,
            right: 0,
            height: "48vh",
            backgroundColor: dark ? "#1f2937" : "#ffffff",
            color: dark ? "#ffffff" : "#111827",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            zIndex: 1000,
            borderTop: dark ? "1px solid #374151" : "1px solid #e5e7eb",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: "bold", fontSize: "15px", color: "#d97706" }}>
              {selectedBook} {selectedChapter} : {currentVerse.verse}
            </span>
            <button
              onClick={() => setSelectedVerseIndex(null)}
              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: dark ? "#fff" : "#173b70" }}
            >
              ✕
            </button>
          </div>
          {/* Texte grand */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "10px 0" }}>
            <p style={{ fontSize: "19px", fontWeight: "500", lineHeight: "1.6", margin: 0 }}>
              "{currentVerse.text}"
            </p>
          </div>
          {/* Actions */}
          {(() => {
            const ref = `${selectedBook} ${selectedChapter}:${currentVerse.verse}`;
            const isFav = favorites.some((f) => f.ref === ref);
            return (
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
                <button
                  onClick={() => handleCopy(currentVerse.text, ref)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: copied ? "#10b981" : dark ? "#374151" : "#e5e7eb",
                    color: dark ? "#fff" : "#374151",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  📋 {copied ? "Copié !" : "Copier"}
                </button>
                <button
                  onClick={() => handleShare(currentVerse.text, ref)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: dark ? "#374151" : "#e5e7eb",
                    color: dark ? "#fff" : "#374151",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  🔗 Partager
                </button>
                <button
                  onClick={() => toggleFavorite(ref, currentVerse.text)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: dark ? "#374151" : "#e5e7eb",
                    color: dark ? "#fff" : "#374151",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {isFav ? "❤️ Retirer" : "🤍 Favoris"}
                </button>
              </div>
            );
          })()}
          {/* Navigation Flèches */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => selectedVerseIndex > 0 && setSelectedVerseIndex(selectedVerseIndex - 1)}
              disabled={selectedVerseIndex === 0}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: selectedVerseIndex === 0 ? "#9ca3af" : "#2563eb",
                color: "#ffffff",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: selectedVerseIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              ← Précédent
            </button>
            <button
              onClick={() =>
                selectedVerseIndex < currentVerses.length - 1 &&
                setSelectedVerseIndex(selectedVerseIndex + 1)
              }
              disabled={selectedVerseIndex === currentVerses.length - 1}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                backgroundColor:
                  selectedVerseIndex === currentVerses.length - 1 ? "#9ca3af" : "#2563eb",
                color: "#ffffff",
                fontWeight: "bold",
                fontSize: "14px",
                cursor:
                  selectedVerseIndex === currentVerses.length - 1 ? "not-allowed" : "pointer",
              }}
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}