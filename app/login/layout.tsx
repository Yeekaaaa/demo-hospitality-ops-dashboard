import { LoginLocaleShell } from "@/app/login/login-locale-shell";
import { getDefaultLocaleFromEnv } from "@/lib/i18n/types";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const initialLocale = getDefaultLocaleFromEnv();
  return <LoginLocaleShell initialLocale={initialLocale}>{children}</LoginLocaleShell>;
}
