import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { useMenuStore } from "@/features/settings/menu/store";

import { AppProviders } from "./providers";
import { router } from "./router";

export default function App() {
  useEffect(() => {
    const triggerHydrate = () => {
      void useMenuStore.getState().hydrateFromFile();
    };

    if (useMenuStore.persist.hasHydrated()) {
      triggerHydrate();
    }
    const unsubscribe = useMenuStore.persist.onFinishHydration(triggerHydrate);
    return () => unsubscribe();
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
