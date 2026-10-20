import { useCallback, useEffect, useState } from "react";

export const Lives = ({ dark }) => {

  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);


  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  const CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
  const CHANNEL_URL = import.meta.env.VITE_YOUTUBE_CHANNEL_URL;


  const verifierDirect = useCallback(async () => {

    try {

      const url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet` +
        `&channelId=${CHANNEL_ID}` +
        `&eventType=live` +
        `&type=video` +
        `&key=${API_KEY}`;


      const response = await fetch(url);

      const data = await response.json();


      if(data.items && data.items.length > 0){

        const videoId = data.items[0].id.videoId;

        setLive({
          actif:true,
          url:`https://youtube.com/watch?v=${videoId}`
        });


      }else{

        setLive({
          actif:false,
          url:CHANNEL_URL
        });

      }


    } catch(error){

      console.log(error);

      setLive({
        actif:false,
        url:CHANNEL_URL
      });

    }

    setLoading(false);

  }, [API_KEY, CHANNEL_ID, CHANNEL_URL]);


  useEffect(()=>{
    const initialCheck = setTimeout(verifierDirect, 0);

    // vérifie toutes les 5 minutes
    const timer = setInterval(
      verifierDirect,
      300000
    );


    return ()=>{
      clearTimeout(initialCheck);
      clearInterval(timer);
    };


  }, [verifierDirect]);



  return (
    <div
      style={{
        padding:"40px 20px",
        textAlign:"center",
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        justifyContent:"center",
        minHeight:"60vh",
      }}
    >

      <div style={{fontSize:64}}>
        🎥
      </div>


      <h2
        style={{
          color:dark ? "#f0e6c8":"#173b70",
          fontSize:22,
          fontWeight:700
        }}
      >
        Direct de l'église
      </h2>


      {
        loading ?

        <p>
          Recherche du direct...
        </p>


        :

        live?.actif ?

        <button
          onClick={()=>{
            window.open(live.url,"_blank")
          }}
          style={{
            marginTop:24,
            padding:"14px 28px",
            borderRadius:12,
            border:"none",
            background:"#c9a84c",
            color:"#fff",
            fontWeight:700,
            cursor:"pointer"
          }}
        >
          ▶ Regarder le direct
        </button>


        :


        <button
          onClick={()=>{
            window.open(live.url,"_blank")
          }}
          style={{
            marginTop:24,
            padding:"14px 28px",
            borderRadius:12,
            border:"1px solid #c9a84c",
            background:"transparent",
            color:dark ? "#f0e6c8":"#173b70",
            fontWeight:700,
            cursor:"pointer"
          }}
        >
          📺 Visiter notre chaîne YouTube
        </button>

      }


    </div>
  );
};
export const Prayer = ({ dark }) => {
  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>
        🙏
      </div>

      <h2
        style={{
          color: dark ? "#f0e6c8" : "#173b70",
          marginBottom: 8,
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        Demande de priere
      </h2>

      <p
        style={{
          color: dark ? "#a1a1a6" : "#6e6e73",
          fontSize: 15,
          maxWidth: 450,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Cette fonctionnalité est actuellement en cours de développement.
        Elle permettra bientôt de faire des demandes de priere.
      </p>

      <div
        style={{
          marginTop: 24,
          padding: "16px 24px",
          borderRadius: 12,
          background: dark ? "#2c2c2e" : "#f0f4fb",
          borderLeft: "4px solid #c9a84c",
          maxWidth: 450,
        }}
      >
        <p
          style={{
            margin: 0,
            color: dark ? "#e0d5b8" : "#2c3e6b",
            fontSize: 14,
            fontStyle: "italic",
          }}
        >
          🚧 Cette section sera disponible dans une prochaine mise à jour.
        </p>
      </div>
    </div>
  );
};