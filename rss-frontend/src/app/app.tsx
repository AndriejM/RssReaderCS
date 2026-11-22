import {Outlet} from "react-router-dom";
import {AppHeader} from "@/features/header";
import {ThemeProvider} from "@/shared/ui/components/theme/theme-provider.tsx";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import ConfirmationDialog from "@/shared/ui/components/alert/confirmation-dialog.tsx";
import {Toaster} from "@/shared/ui/kit/sonner.tsx";


export function App() {
  useAppConfigStoreAsync((state) => state.appConfig);
  return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div>
          <ConfirmationDialog />
          <Toaster />
          <AppHeader/>
          <Outlet/>
        </div>
      </ThemeProvider>
  );
}
