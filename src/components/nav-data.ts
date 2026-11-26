import { CabIcon, FoodIcon, GroceryIcon, ShopIcon, StayIcon, TourIcon } from "@/components/CategoryIcons";

/**
 * The six gowayy service categories.
 * `ring` is the story-style gradient border, `tile` the soft inner fill, `fg` the icon colour.
 * Each hue blends into the brand violet so the row reads as one family.
 */
export const SERVICES = [
  { href: "/grocery", label: "Grocery", icon: GroceryIcon, ring: "from-emerald-400 via-teal-400 to-brand-500", tile: "bg-emerald-50", fg: "text-emerald-700" },
  { href: "/food", label: "Food", icon: FoodIcon, ring: "from-orange-400 via-rose-400 to-brand-500", tile: "bg-orange-50", fg: "text-orange-600" },
  { href: "/cabs", label: "Cabs", icon: CabIcon, ring: "from-amber-400 via-orange-400 to-brand-500", tile: "bg-amber-50", fg: "text-amber-700" },
  { href: "/tours", label: "Tours", icon: TourIcon, ring: "from-brand-400 via-fuchsia-400 to-brand-700", tile: "bg-brand-50", fg: "text-brand-700" },
  { href: "/hotels", label: "Stays", icon: StayIcon, ring: "from-sky-400 via-indigo-400 to-brand-500", tile: "bg-sky-50", fg: "text-sky-700" },
  { href: "/shops", label: "Shops", icon: ShopIcon, ring: "from-pink-400 via-fuchsia-400 to-brand-500", tile: "bg-pink-50", fg: "text-pink-600" },
] as const;

/** Desktop header links. Explore stays reachable from the bottom nav and section links. */
export const NAV_LINKS = [
  { href: "/tours", label: "Tours" },
  { href: "/hotels", label: "Stays" },
  { href: "/cabs", label: "Cabs" },
  { href: "/grocery", label: "Grocery" },
  { href: "/food", label: "Food" },
  { href: "/shops", label: "Shops" },
];
