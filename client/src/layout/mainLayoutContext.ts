import { useOutletContext } from "react-router-dom";

export type MainLayoutOutletContext = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

export function useMainLayoutOutlet(): MainLayoutOutletContext {
  return useOutletContext<MainLayoutOutletContext>();
}
