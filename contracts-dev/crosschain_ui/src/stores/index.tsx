import { createContext } from "react";
import { ChainStore } from "./ChainStore";

export const rootStoreContext = createContext({
  chainStore: new ChainStore(),
});
