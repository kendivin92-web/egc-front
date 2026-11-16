import { createContext } from "react";

export const NetworkStatusContext = createContext({
  isOnline: false,
  isReady: false,
});
