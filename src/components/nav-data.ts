import { CabIcon, FoodIcon, GroceryIcon, ShopIcon, StayIcon, TourIcon } from "@/components/CategoryIcons";

/**
 * The six gowayy service categories.
 * `img` is the artwork shown in the services sheet; `ring` the story-style gradient border.
 * (`icon`/`tile`/`fg` remain for compact icon uses.)
 * Each hue blends into the brand violet so the row reads as one family.
 */
export const SERVICES = [
  { href: "/tours", label: "Tours", icon: TourIcon, img: "/media/cat/fun/tours.webp", ring: "from-brand-400 via-fuchsia-400 to-brand-700", tile: "bg-brand-50", fg: "text-brand-700" },
  { href: "/cabs", label: "Cabs", icon: CabIcon, img: "/media/cat/fun/cabs.webp", ring: "from-amber-400 via-orange-400 to-brand-500", tile: "bg-amber-50", fg: "text-amber-700" },
  { href: "/hotels", label: "Stays", icon: StayIcon, img: "/media/cat/fun/stays.webp", ring: "from-sky-400 via-indigo-400 to-brand-500", tile: "bg-sky-50", fg: "text-sky-700" },
  { href: "/food", label: "Food", icon: FoodIcon, img: "/media/cat/fun/food.webp", ring: "from-orange-400 via-rose-400 to-brand-500", tile: "bg-orange-50", fg: "text-orange-600" },
  { href: "/grocery", label: "Grocery", icon: GroceryIcon, img: "/media/cat/fun/grocery.webp", ring: "from-emerald-400 via-teal-400 to-brand-500", tile: "bg-emerald-50", fg: "text-emerald-700" },
  { href: "/shops", label: "Shops", icon: ShopIcon, img: "/media/cat/fun/shops.webp", ring: "from-pink-400 via-fuchsia-400 to-brand-500", tile: "bg-pink-50", fg: "text-pink-600" },
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
