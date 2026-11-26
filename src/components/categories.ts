/**
 * Home category rail. Every entry opens a real, filtered listing; photos live in
 * /public/media/cat. `ring` is the story-style gradient border, tuned per item but
 * always blending into the brand violet so the row reads as one family.
 */
/** Order: trips, cabs and stays lead, then everyday shopping, then food cravings. */
export type HomeCategory = { href: string; label: string; img: string; ring: string };

const R = {
  green: "from-emerald-400 via-teal-400 to-brand-500",
  orange: "from-orange-400 via-rose-400 to-brand-500",
  amber: "from-amber-400 via-orange-400 to-brand-500",
  violet: "from-brand-400 via-fuchsia-400 to-brand-700",
  sky: "from-sky-400 via-indigo-400 to-brand-500",
  pink: "from-pink-400 via-fuchsia-400 to-brand-500",
  red: "from-red-500 via-orange-400 to-brand-500",
};

export const HOME_CATEGORIES: HomeCategory[] = [
  { href: "/tours", label: "Tours", img: "/media/cat/fun/tours.webp", ring: R.violet },
  { href: "/cabs", label: "Cabs", img: "/media/cat/fun/cabs.webp", ring: R.amber },
  { href: "/hotels", label: "Stays", img: "/media/cat/fun/stays.webp", ring: R.sky },
  { href: "/grocery", label: "Grocery", img: "/media/cat/fun/grocery.webp", ring: R.green },
  { href: "/food", label: "Food", img: "/media/cat/fun/food.webp", ring: R.orange },
  { href: "/offers", label: "Best offers", img: "/media/cat/fun/offers.webp", ring: R.violet },
  { href: "/food?cat=Pizza", label: "Pizzas", img: "/media/cat/fun/pizza.webp", ring: R.amber },
  { href: "/food?q=spicy", label: "Spicy", img: "/media/cat/fun/spicy.webp", ring: R.red },
  { href: "/food?cat=Momos", label: "Momos", img: "/media/cat/fun/momos.webp", ring: R.pink },
  { href: "/food?cat=Biryani", label: "Biryani", img: "/media/cat/fun/biryani.webp", ring: R.amber },
  { href: "/grocery?cat=Fresh+produce", label: "Fresh veg", img: "/media/cat/fun/veggies.webp", ring: R.green },
  { href: "/food?cat=Dessert", label: "Desserts", img: "/media/cat/fun/desserts.webp", ring: R.pink },
  { href: "/grocery?cat=Bakery", label: "Bakery", img: "/media/cat/fun/bakery.webp", ring: R.orange },
  { href: "/food?cat=Tea+%26+coffee", label: "Chai & tea", img: "/media/cat/fun/tea.webp", ring: R.green },
  { href: "/shops", label: "Shops", img: "/media/cat/fun/shops.webp", ring: R.pink },
];
