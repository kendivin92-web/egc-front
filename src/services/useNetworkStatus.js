import { useContext } from "react";
import { NetworkStatusContext } from "./NetworkStatusContext.js";

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}
