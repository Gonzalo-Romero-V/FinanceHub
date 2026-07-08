import {
  BookOpen,
  CircleHelp,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  User,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const publicNavLinks: NavLink[] = [
  { href: "/home", label: "Home", icon: LayoutDashboard },
  { href: "/tutorial", label: "Tutorial", icon: BookOpen },
];

export const userNavLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ReceiptText },
  { href: "/cuentas", label: "Cuentas", icon: WalletMinimal },
  { href: "/conceptos", label: "Conceptos", icon: BookOpen },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
];

export const userSecondaryLinks: NavLink[] = [
  { href: "/perfil", label: "Mi perfil", icon: User },
  // "/help" es especial: en header-user.tsx y aside-user.tsx no se
  // renderiza como link — el ícono reinicia las coach marks de la página
  // actual (ver useHelpIconAction). La guía rápida en sí se accede desde
  // Perfil o desde los links "Más info" de cada coach mark.
  { href: "/help", label: "Ayuda", icon: CircleHelp },
];
