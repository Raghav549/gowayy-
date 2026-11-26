import { BedDouble, CarTaxiFront, Mountain, ShoppingBasket, Store, UtensilsCrossed } from "lucide-react";

export const SERVICES = [
  { href: "/grocery", label: "Grocery", sub: "Delivered in 10 min", icon: ShoppingBasket, bg: "from-emerald-200/80 to-emerald-50", fg: "text-emerald-700" },
  { href: "/food", label: "Food", sub: "Local kitchens", icon: UtensilsCrossed, bg: "from-orange-200/80 to-orange-50", fg: "text-orange-600" },
  { href: "/cabs", label: "Cabs", sub: "Hill rides & transfers", icon: CarTaxiFront, bg: "from-amber-200/80 to-amber-50", fg: "text-amber-700" },
  { href: "/tours", label: "Tours", sub: "Curated packages", icon: Mountain, bg: "from-violet-300/80 to-violet-50", fg: "text-violet-700" },
  { href: "/hotels", label: "Stays", sub: "Hotels & homestays", icon: BedDouble, bg: "from-sky-200/80 to-sky-50", fg: "text-sky-700" },
  { href: "/shops", label: "Shops", sub: "Local crafts & tea", icon: Store, bg: "from-pink-200/80 to-pink-50", fg: "text-pink-600" },
] as const;

export const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/tours", label: "Tours" },
  { href: "/hotels", label: "Stays" },
  { href: "/cabs", label: "Cabs" },
  { href: "/grocery", label: "Grocery" },
  { href: "/food", label: "Food" },
  { href: "/shops", label: "Shops" },
];
