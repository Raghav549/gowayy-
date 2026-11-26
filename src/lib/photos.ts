// Real photos for catalogue items, stored in public/media/<kind>/<key>.webp so
// they ship with the deployment (no hot-linking). Keys are entity slugs, and for
// products the slugified product name. Regenerate the lists when files change.

const KEYS = {
  dest: [
    "darjeeling", "gangtok", "kalimpong", "kurseong", "lava-lolegaon", "mirik", "pelling", "sandakphu",
    "siliguri",
  ],
  attr: [
    "batasia-loop-and-war-memorial", "bokar-monastery-and-tea-gardens", "chenrezig-statue-and-skywalk",
    "darjeeling-himalayan-railway-joy-ride", "deolo-hill", "dow-hill-and-eagle-s-crag", "ghum-monastery",
    "happy-valley-tea-estate", "kalimpong-orchid-nurseries", "lava-monastery", "lolegaon-canopy-walk",
    "mahananda-wildlife-sanctuary", "makaibari-tea-estate-walk", "mg-marg-promenade",
    "neora-valley-national-park", "padmaja-naidu-zoo-and-hmi", "peace-pagoda", "pemayangtse-monastery",
    "rumtek-monastery", "sandakphu-summit", "sumendu-lake", "tiger-hill-sunrise", "tsomgo-changu-lake",
    "tumling-ridge-camp", "zong-dog-palri-fo-brang-monastery",
  ],
  hotel: [
    "deolo-orchid-retreat", "himal-homestay-kalimpong", "kanchan-view-residency", "lakeview-pine-resort",
    "lava-cloud-cottages", "makai-tea-villa", "mall-road-inn", "maneybhanjang-trekkers-lodge",
    "mg-marg-skyline-hotel", "njp-gateway-suites", "pelling-monal-heights", "tea-terrace-boutique-stay",
    "the-cloud-nine-heritage",
  ],
  pkg: [
    "darjeeling-classic", "darjeeling-gangtok", "darjeeling-kalimpong", "himalayan-honeymoon",
    "lava-lolegaon-weekend", "sandakphu-trek", "sikkim-grand", "tea-trail",
  ],
  cab: [
    "bike", "hatchback", "innova", "sedan", "suv", "tempo",
  ],
  vendor: [
    "chowrasta-fresh-mart", "gangtok-himalayan-grocers", "gangtok-skyline-dine", "gangtok-thangka-gallery",
    "hill-kart", "himalayan-tea-emporium", "kalimpong-cheese-and-orchids", "kalimpong-kafe",
    "kalimpong-organic-bazaar", "kurseong-chai-adda", "kurseong-valley-provisions", "lakeside-tibetan",
    "lava-pine-dhaba", "lepcha-weaves-studio", "makaibari-boutique", "mirik-daily-needs",
    "momo-mountain-kitchen", "siliguri-biryani-house", "siliguri-metro-mart", "slice-of-the-hills",
    "tea-room-cafe", "thakali-kitchen", "tibetan-craft-bazaar",
  ],
  prod: [
    "aloo-dum", "aloo-paratha", "baby-potatoes", "bamboo-basket", "bananas", "basmati-rice",
    "blueberry-muffin", "broccoli", "butter-croissant", "cactus-pot", "cappuccino",
    "cheese-omelette-sandwich", "chhurpi-soup", "chicken-curry-cut", "chicken-curry-rice",
    "chicken-dum-biryani", "chicken-thali", "chicken-thukpa", "chilli-chicken-dry",
    "classic-margherita-pizza", "dal-bhat-tarkari", "darjeeling-first-flush-pot", "darjeeling-oranges",
    "darjeeling-tea-leaf", "dark-chocolate", "dendrobium-orchid-plant", "dumyang-wool-cap", "egg-maggi",
    "egg-roll", "estate-plucking-walk", "estate-tea-walk-and-tasting", "farm-eggs", "farm-fresh-milk",
    "farmhouse-tomato-and-herb-pizza", "fiery-jalapeno-chicken-pizza", "filter-coffee", "fine-art-thangka",
    "first-flush-darjeeling", "fresh-paneer", "fresh-rohu", "fresh-spinach", "fried-chicken-momo",
    "fried-momo", "gift-tin-set", "green-chillies", "grilled-chicken-sandwich", "gundruk-soup",
    "gyathuk-noodle-soup", "hand-warmers", "handloom-scarf", "hill-tomatoes", "himalayan-carrots",
    "hot-chocolate", "hot-garlic-chicken-wings", "instant-noodles", "jalebi", "jhol-momo",
    "kalimpong-cheese-pizza", "kalimpong-cheese-toast", "kalimpong-farmhouse-cheese", "kebab-platter",
    "kothey-fried-momo", "lemon-honey-tea", "lepcha-handloom-stole", "lepcha-weaving-workshop", "masala-chai",
    "mineral-water", "mini-thangka-painting", "mixed-fruit-juice", "mountain-apples", "muscatel-reserve",
    "mustard-oil", "mutton-biryani", "namkeen-mix", "oat-cookies", "orchid-nursery-tour",
    "organic-himalayan-honey", "pakora-basket", "pasta-alfredo", "pav-buns", "phagshapa", "phirni",
    "pork-momo", "prayer-flags-set", "private-gallery-walk", "rain-poncho", "rajma-chawal",
    "sael-roti-and-aloo", "salted-butter", "samosa", "scones-with-jam-and-cream", "second-flush-darjeeling",
    "sel-roti", "shaphale", "sikkim-large-cardamom", "sikkim-tea", "sikkim-temi-tea", "silver-tips-imperial",
    "smoked-pork-sausage-pizza", "spicy-chicken-pakora", "spicy-hyderabadi-chicken-biryani",
    "steamed-chicken-momo", "steamed-veg-momo", "strawberries", "tea-tasting-session",
    "thangka-painting-workshop", "thick-curd", "tibetan-singing-bowl", "toor-dal", "toothpaste",
    "veg-biryani", "veg-thali", "veg-thukpa", "walnut-brownie", "warm-apple-pie", "whole-wheat-atta",
    "whole-wheat-bread", "woollen-socks", "yak-wool-shawl",
  ],
} as const;

export type PhotoKind = keyof typeof KEYS;
const SETS = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [k, new Set<string>(v)])) as Record<PhotoKind, Set<string>>;

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Every key that has a photo, for bulk updates. */
export function photoKeys(kind: PhotoKind): readonly string[] {
  return KEYS[kind];
}

/** Local photo for an entity slug, or undefined when there is none. */
export function photo(kind: PhotoKind, key: string): string | undefined {
  return SETS[kind].has(key) ? `/media/${kind}/${key}.webp` : undefined;
}

/** Local photo for a product by name ("Fried Momo (8 pcs)" → fried-momo). */
export function productPhoto(name: string): string | undefined {
  return photo("prod", slug(name)) ?? photo("prod", slug(name.replace(/\([^)]*\)/g, "")));
}
