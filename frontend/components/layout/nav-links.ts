import {
  BookOpen,
  CircleHelp,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  TrendingDown,
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
  { href: "/deudas", label: "Deudas", icon: TrendingDown },
];

export const userSecondaryLinks: NavLink[] = [
  { href: "/perfil", label: "Mi perfil", icon: User },
  { href: "/help", label: "Tutorial", icon: CircleHelp },
];
