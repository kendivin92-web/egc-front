import React from "react";

const Encouragement = ({ dark }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "24px 18px 40px",
        background: dark ? "#101A2A" : "#F7F9FC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          padding: "40px 25px",
          borderRadius: 28,
          textAlign: "center",
          background: dark
            ? "linear-gradient(145deg, #1E2D45, #253A5A)"
            : "linear-gradient(145deg, #FFFFFF, #F5F8FF)",
          border: `1px solid ${dark ? "#324867" : "#E5ECF8"}`,
          boxShadow: dark
            ? "0 12px 35px rgba(0,0,0,0.28)"
            : "0 12px 35px rgba(31,50,81,0.09)",
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            margin: "0 auto 22px",
            borderRadius: "50%",
            background: dark ? "#2D405F" : "#F8F2DF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
          }}
        >
          📖
        </div>

        <h2
          style={{
            margin: "0 0 14px",
            fontSize: 23,
            color: dark ? "#F5E6B8" : "#1A2744",
          }}
        >
          Mots d'encouragement
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.7,
            color: dark ? "#D5DFEA" : "#56657D",
          }}
        >
          Ici seront publiés les mots d'encouragement du Pasteur Marc Sakala.
        </p>

        <div
          style={{
            width: 55,
            height: 3,
            borderRadius: 20,
            background: "#C9A84C",
            margin: "25px auto 0",
          }}
        />
      </div>
    </div>
  );
};

export default Encouragement;