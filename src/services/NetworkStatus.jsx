import { useEffect, useMemo, useState } from "react";
import { Network } from "@capacitor/network";
import { NetworkStatusContext } from "./NetworkStatusContext.js";

export function NetworkStatusProvider({ children }) {
  const [status, setStatus] = useState({ isOnline: false, isReady: false });

  useEffect(() => {
    let disposed = false;
    let receivedNetworkEvent = false;
    let networkListener;

    const updateStatus = (networkStatus) => {
      receivedNetworkEvent = true;
      setStatus({ isOnline: networkStatus.connected, isReady: true });
    };
    const updateFromBrowser = () => {
      setStatus({ isOnline: navigator.onLine, isReady: true });
    };

    Network.getStatus()
      .then((networkStatus) => {
        if (!disposed && !receivedNetworkEvent) updateStatus(networkStatus);
      })
      .catch((error) => {
        console.error("Impossible de vérifier l’état du réseau :", error);
        if (!disposed && !receivedNetworkEvent) updateFromBrowser();
      });

    Network.addListener("networkStatusChange", updateStatus)
      .then((listener) => {
        if (disposed) {
          listener.remove();
        } else {
          networkListener = listener;
        }
      })
      .catch((error) => {
        console.error("Impossible d’écouter les changements réseau :", error);
      });

    window.addEventListener("online", updateFromBrowser);
    window.addEventListener("offline", updateFromBrowser);

    return () => {
      disposed = true;
      networkListener?.remove();
      window.removeEventListener("online", updateFromBrowser);
      window.removeEventListener("offline", updateFromBrowser);
    };
  }, []);

  const value = useMemo(() => status, [status]);
  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}
