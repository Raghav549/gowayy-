import { and, inArray } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { pool } from "@/db";
import { CREATE_SCHEMA, SCHEMA_VERSION, UPGRADE_COLUMNS } from "@/db/schema-sql";
import {
  users,
  destinations,
  locations,
  attractions,
  hotels,
  packages,
  cabTypes,
  vendors,
  products,
  coupons,
} from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { pick, type PoolKey } from "@/lib/images";
import { photo, photoKeys, productPhoto } from "@/lib/photos";

const g = globalThis as typeof globalThis & { __gwSeed?: Promise<void> };

/**
 * Makes sure the database is ready: tables exist, columns are current and the
 * catalogue is seeded. Runs once per server instance (the promise is cached)
 * and is safe to call from anywhere, so a brand-new database — such as a
 * freshly attached Vercel Postgres — works on the very first request.
 */
export function ensureSeeded(): Promise<void> {
  if (!g.__gwSeed) {
    g.__gwSeed = run().catch((e) => {
      g.__gwSeed = undefined; // retry on the next request
      throw e;
    });
  }
  return g.__gwSeed;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const rate = (i: number, base = 4.2) => Math.min(4.9, Math.round((base + ((i * 37 + 11) % 8) / 10) * 10) / 10);

const META = `CREATE TABLE IF NOT EXISTS "_gowayy_meta" ("key" text PRIMARY KEY, "value" text NOT NULL)`;

async function isReady(): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `select (select value from "_gowayy_meta" where key = 'schema') as v,
              (select value from "_gowayy_meta" where key = 'catalog') as c,
              exists(select 1 from destinations) as seeded`,
    );
    return rows[0]?.v === SCHEMA_VERSION && rows[0]?.c === CATALOG_VERSION && rows[0]?.seeded === true;
  } catch {
    return false; // tables missing → full bootstrap
  }
}

async function run() {
  // Warm path: one round trip once the database is set up.
  if (await isReady()) return;

  const client = await pool.connect();
  try {
    // Everything happens in one transaction under a transaction-scoped lock:
    // concurrent cold starts wait for each other, a failure leaves nothing
    // half-created, and it works behind PgBouncer-style poolers (Neon,
    // Supabase) where session-level advisory locks are unreliable.
    //
    // Every step is batched into as few round trips as possible: the database
    // is often in another region than the serverless function (e.g. Neon in
    // Singapore, Vercel in Washington), where each round trip costs ~200 ms.
    await client.query("BEGIN; SELECT pg_advisory_xact_lock(727272);");
    // DDL has no parameters, so the whole schema goes over as one simple query.
    await client.query([...CREATE_SCHEMA, ...UPGRADE_COLUMNS, `${META};`].join("\n"));
    const { rows } = await client.query("select exists(select 1 from destinations) as seeded");
    if (!rows[0].seeded) await seedAll(drizzle(client));
    await addCatalogExtras(drizzle(client));
    await applyPhotos(client);
    await client.query(
      `insert into "_gowayy_meta" (key, value) values ('schema', $1), ('catalog', $2)
       on conflict (key) do update set value = excluded.value`,
      [SCHEMA_VERSION, CATALOG_VERSION],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ---------- DATA ----------
type D = [string, string, string, string, string, string, string, PoolKey, number, string[], boolean, number, number];
const DEST: D[] = [
  ["darjeeling", "Darjeeling", "West Bengal", "Queen of the Hills", "Misty tea gardens, the toy train and Kanchenjunga at sunrise — the Himalayan classic.", "2,042 m", "Mar–May · Oct–Dec", "tea", 0, ["Tea", "Sunrise", "Heritage"], true, 27.036, 88.2627],
  ["kalimpong", "Kalimpong", "West Bengal", "Orchids, monasteries & cheese", "A relaxed hill town of colonial homes, nurseries and panoramic Teesta valley views.", "1,247 m", "Feb–May · Sep–Nov", "gompa", 1, ["Monasteries", "Orchids", "Culture"], true, 27.0594, 88.4695],
  ["mirik", "Mirik", "West Bengal", "Lakeside pine calm", "A serene lake, orange orchards and tea slopes just two hours from Darjeeling.", "1,495 m", "Oct–May", "lake", 2, ["Lake", "Tea", "Quiet"], false, 26.887, 88.184],
  ["kurseong", "Kurseong", "West Bengal", "Land of the white orchid", "Boutique tea estates, pine forests and the road every Darjeeling trip passes through.", "1,458 m", "Oct–Apr", "tea", 4, ["Tea estates", "Forest", "Homestays"], false, 26.881, 88.278],
  ["lava-lolegaon", "Lava & Lolegaon", "West Bengal", "Offbeat cloud villages", "Monastery mornings, canopy walks and Neora Valley forests above the clouds.", "2,150 m", "Mar–Jun · Oct–Dec", "tea", 2, ["Offbeat", "Forest", "Birding"], true, 27.087, 88.633],
  ["sandakphu", "Sandakphu", "Singalila Ridge", "The sleeping Buddha trek", "Bengal's highest point with four of the five highest peaks on Earth in a single frame.", "3,636 m", "Apr–May · Oct–Nov", "peaks", 2, ["Trek", "Peaks", "Adventure"], true, 27.103, 88.002],
  ["gangtok", "Gangtok", "Sikkim", "Capital of Sikkim", "Monasteries, momo lanes, ropeways and the buzzing pedestrian MG Marg.", "1,650 m", "Mar–Jun · Oct–Dec", "city", 0, ["City", "Monasteries", "Food"], true, 27.3314, 88.6138],
  ["pelling", "Pelling", "Sikkim", "Face to face with Kanchenjunga", "Ancient monasteries, a glass skywalk and the closest views of the third highest peak.", "2,150 m", "Mar–May · Oct–Dec", "gompa", 0, ["Monasteries", "Skywalk", "Peaks"], false, 27.29, 88.238],
  ["siliguri", "Siliguri", "Gateway", "Your gateway to the hills", "NJP station, Bagdogra airport and the plains hub where every hill journey begins.", "122 m", "All year", "jeep", 0, ["Gateway", "Transit", "Food"], false, 26.7271, 88.3953],
];

// [dest, name, kind, lat, lng]
const LOCS: [string, string, string, number, number][] = [
  ["siliguri", "New Jalpaiguri (NJP) Station", "station", 26.6846, 88.4428],
  ["siliguri", "Bagdogra Airport (IXB)", "airport", 26.6812, 88.3286],
  ["siliguri", "Siliguri City Centre", "town", 26.7271, 88.3953],
  ["darjeeling", "Darjeeling Chowrasta & Mall", "town", 27.041, 88.2663],
  ["darjeeling", "Ghum Railway Station", "station", 27.0125, 88.2547],
  ["kalimpong", "Kalimpong Town (Main Market)", "town", 27.0594, 88.4695],
  ["mirik", "Mirik Bazaar", "town", 26.8855, 88.1865],
  ["kurseong", "Kurseong Station Road", "town", 26.881, 88.278],
  ["lava-lolegaon", "Lava Village", "town", 27.087, 88.633],
  ["sandakphu", "Maneybhanjang (Trek Base)", "town", 27.017, 88.1105],
  ["gangtok", "Gangtok MG Marg", "town", 27.3314, 88.6138],
  ["pelling", "Pelling Helipad Ground", "town", 27.29, 88.238],
];

type A = [string, string, string, string, PoolKey, number, string, string, string, number?, number?];
const ATTR: A[] = [
  ["darjeeling", "Tiger Hill Sunrise", "Sunrise point", "Wake before dawn and watch Kanchenjunga turn gold from the most famous viewpoint in the Eastern Himalaya.", "peaks", 60, "3 hrs", "4:00 AM – 7:30 AM", "Carry a down jacket — it is freezing before sunrise.", 26.999, 88.2829],
  ["darjeeling", "Batasia Loop & War Memorial", "Heritage", "A spiral railway loop wrapping a manicured garden and a memorial with a 360° mountain panorama.", "train", 30, "1.5 hrs", "5:30 AM – 8:00 PM", "Catch the toy train passing the loop around 10 AM.", 27.0305, 88.2458],
  ["darjeeling", "Darjeeling Himalayan Railway Joy Ride", "Toy train", "A UNESCO World Heritage steam ride from Darjeeling to Ghum through quaint bazaars.", "train", 1500, "2 hrs", "10:40 AM & 1:10 PM", "Book the steam joy ride early in peak season.", 27.0412, 88.2645],
  ["darjeeling", "Peace Pagoda", "Spiritual", "A white-and-gold stupa among pine trees, perfect for quiet mornings and golden-hour photos.", "gompa", 0, "1 hr", "4:30 AM – 7:00 PM", "Pair with the Japanese Temple next door.", 27.0196, 88.2692],
  ["darjeeling", "Happy Valley Tea Estate", "Tea estate", "Walk through one of the oldest estates, watch the factory floor and sip first-flush tea.", "tea", 100, "1.5 hrs", "8:00 AM – 4:30 PM", "Factory is closed on Sundays.", 27.0485, 88.2707],
  ["darjeeling", "Padmaja Naidu Zoo & HMI", "Wildlife", "Home of snow leopards and red pandas, beside the Himalayan Mountaineering Institute museum.", "peaks", 100, "2.5 hrs", "9:00 AM – 4:00 PM", "Closed on Thursdays.", 27.0527, 88.2528],
  ["darjeeling", "Ghum Monastery", "Spiritual", "A 19th-century Tibetan Buddhist monastery with a giant Maitreya statue.", "gompa", 20, "1 hr", "8:00 AM – 5:00 PM", "Try the thukpa stalls outside.", 27.0054, 88.2456],
  ["kalimpong", "Deolo Hill", "Viewpoint", "The highest point in Kalimpong with sweeping valley views, a park and cafés.", "peaks", 20, "1.5 hrs", "7:00 AM – 6:00 PM", "Best at sunset with a hot chocolate.", 27.0735, 88.4724],
  ["kalimpong", "Zong Dog Palri Fo-Brang Monastery", "Spiritual", "Colourful monastery on Durpin Dara hill, blessed by the Dalai Lama.", "gompa", 0, "1 hr", "6:00 AM – 5:00 PM", "Photography is limited indoors.", 27.0608, 88.4571],
  ["kalimpong", "Kalimpong Orchid Nurseries", "Nature", "Walk through greenhouses of rare orchids, cacti and Himalayan blooms.", "tea", 30, "1.5 hrs", "8:00 AM – 4:30 PM", "Spring is peak bloom season.", 27.0551, 88.4611],
  ["mirik", "Sumendu Lake", "Lake", "A pretty lake ringed by pine and a wooden bridge — boating, horse rides and snacks.", "lake", 10, "2 hrs", "6:00 AM – 6:00 PM", "Walk the full loop in the early morning.", 26.8873, 88.1845],
  ["mirik", "Bokar Monastery & Tea Gardens", "Tea estate", "Hike among Tingling tea slopes to a peaceful monastery with views over the plains.", "tea", 0, "2 hrs", "7:00 AM – 5:00 PM", "Wear grippy shoes; the path is steep.", 26.8921, 88.1792],
  ["kurseong", "Makaibari Tea Estate Walk", "Tea estate", "A guided biodynamic estate walk with a tasting of award-winning teas.", "tea", 200, "2 hrs", "9:00 AM – 4:00 PM", "Ask for the silver tips tasting.", 26.8764, 88.2807],
  ["kurseong", "Dow Hill & Eagle's Crag", "Forest walk", "Mossy pine forests, a museum and a rocky viewpoint over the plains.", "peaks", 20, "2 hrs", "9:00 AM – 4:00 PM", "Fog rolls in fast — go before noon.", 26.8946, 88.2858],
  ["lava-lolegaon", "Lava Monastery", "Spiritual", "A quiet hilltop monastery surrounded by misty forests and a mountain village.", "gompa", 0, "1 hr", "6:00 AM – 5:00 PM", "Stay for the evening prayers.", 27.0822, 88.6368],
  ["lava-lolegaon", "Lolegaon Canopy Walk", "Adventure", "A suspension canopy walk through oak forest with sunrise peak views.", "tea", 150, "2 hrs", "6:00 AM – 4:00 PM", "Reach by 6 AM for the Kanchenjunga view.", 27.0668, 88.6967],
  ["lava-lolegaon", "Neora Valley National Park", "Wildlife", "Rhododendron forests, red pandas and 250+ bird species.", "lake", 150, "Half day", "6:00 AM – 3:00 PM", "Permit required — gowayy arranges it for you.", 27.0942, 88.6865],
  ["sandakphu", "Sandakphu Summit", "Trek", "The sleeping Buddha range, Everest, Lhotse, Makalu and Kanchenjunga in a single frame.", "peaks", 0, "Multi-day", "Sunrise", "Hire a local guide; mandatory in the park.", 27.1033, 88.0017],
  ["sandakphu", "Tumling Ridge Camp", "Trek", "Overnight stop on the Singalila ridge with endless rhododendron trails.", "peaks", 0, "Overnight", "All day", "Book lodges in advance.", 27.0742, 88.0386],
  ["gangtok", "MG Marg Promenade", "Shopping & food", "Gangtok's spotless pedestrian boulevard — cafés, shops and live music in the evening.", "city", 0, "2 hrs", "10:00 AM – 10:00 PM", "Try a momo crawl with a local.", 27.3314, 88.6138],
  ["gangtok", "Rumtek Monastery", "Spiritual", "Seat of the Karmapa with ornate murals and golden stupas.", "gompa", 10, "1.5 hrs", "9:00 AM – 4:00 PM", "Carry ID — permits may be checked.", 27.2889, 88.5613],
  ["gangtok", "Tsomgo (Changu) Lake", "Lake", "A glacial lake at 3,753 m — yak rides and snow in winter.", "lake", 0, "Full day", "8:00 AM – 3:00 PM", "Permit and 4x4 cab recommended.", 27.3752, 88.7618],
  ["pelling", "Pemayangtse Monastery", "Spiritual", "One of Sikkim's oldest monasteries with a seven-tiered wooden sculpture.", "gompa", 30, "1 hr", "7:00 AM – 5:00 PM", "Sunset light is magical here.", 27.3018, 88.2435],
  ["pelling", "Chenrezig Statue & Skywalk", "Adventure", "A towering Avalokiteshvara statue with a glass skywalk facing Kanchenjunga.", "peaks", 150, "1.5 hrs", "8:00 AM – 5:00 PM", "Arrive early for clear peak views.", 27.2924, 88.2315],
  ["siliguri", "Mahananda Wildlife Sanctuary", "Wildlife", "Elephant and bison territory on the edge of the city — a pleasant half-day safari.", "lake", 120, "Half day", "6:00 AM – 3:00 PM", "Jeep safaris leave from Salugara.", 26.7716, 88.4122],
];

type H = [string, string, string, string, number, number, number, string[], string, number?, number?];
const HOTELS: H[] = [
  ["darjeeling", "The Cloud Nine Heritage", "Heritage hotel", "A colonial-era property with log fires, high tea and a Kanchenjunga-facing veranda.", 9800, 5, 4.8, ["Free WiFi", "Breakfast", "Fireplace", "Mountain view", "Spa", "Room service"], "Observatory Hill", 27.0432, 88.2615],
  ["darjeeling", "Kanchan View Residency", "4★ hotel", "Modern rooms with floor-to-ceiling windows and a rooftop restaurant.", 5400, 4, 4.5, ["Free WiFi", "Breakfast", "Mountain view", "Rooftop café", "Heater"], "Mall Road", 27.0408, 88.2641],
  ["darjeeling", "Tea Terrace Boutique Stay", "Boutique", "Seven suites hidden inside a working tea garden with private balconies.", 7200, 4, 4.7, ["Free WiFi", "Breakfast", "Tea tasting", "Garden", "Bonfire"], "Happy Valley", 27.0481, 88.2692],
  ["darjeeling", "Mall Road Inn", "Budget stay", "Clean, cosy rooms steps away from Chowrasta, cafés and the taxi stand.", 1900, 3, 4.2, ["Free WiFi", "Hot water", "Heater", "24h desk"], "Chowrasta", 27.0415, 88.2659],
  ["kalimpong", "Deolo Orchid Retreat", "Resort", "Cottages among orchid gardens on Deolo Hill with an in-house Himalayan kitchen.", 6100, 4, 4.6, ["Free WiFi", "Breakfast", "Garden", "Valley view", "Bonfire"], "Deolo Hill", 27.0742, 88.4701],
  ["kalimpong", "Himal Homestay Kalimpong", "Homestay", "A family-run colonial villa serving home-cooked Nepali and Tibetan meals.", 2600, 3, 4.7, ["Home meals", "Free WiFi", "Garden", "Heater"], "Rinkingpong Road", 27.0571, 88.4652],
  ["mirik", "Lakeview Pine Resort", "Resort", "Lakeside cottages with pine-framed windows and a bonfire deck.", 4300, 4, 4.4, ["Lake view", "Breakfast", "Free WiFi", "Bonfire", "Boating"], "Sumendu Lake", 26.8879, 88.1851],
  ["kurseong", "Makai Tea Villa", "Tea villa", "A four-room bungalow in a tea estate with a plantation-to-cup experience.", 5200, 4, 4.8, ["Breakfast", "Tea walk", "Garden", "Free WiFi", "Library"], "Makaibari", 26.8769, 88.2799],
  ["lava-lolegaon", "Lava Cloud Cottages", "Cottages", "Wooden cottages with fireplaces and sunrise views above the clouds.", 3500, 3, 4.5, ["Fireplace", "Home meals", "Mountain view", "Bonfire"], "Lava", 27.0865, 88.6322],
  ["gangtok", "MG Marg Skyline Hotel", "4★ hotel", "Right on the promenade with rooftop dining and a spa.", 6500, 4, 4.5, ["Free WiFi", "Breakfast", "Spa", "Rooftop café", "Mountain view"], "MG Marg", 27.3318, 88.6141],
  ["pelling", "Pelling Monal Heights", "Resort", "Every room faces Kanchenjunga; the sunrise is served with morning tea.", 5800, 4, 4.6, ["Mountain view", "Breakfast", "Free WiFi", "Heater", "Garden"], "Upper Pelling", 27.2918, 88.2362],
  ["sandakphu", "Maneybhanjang Trekkers Lodge", "Lodge", "Warm trekker's lodge at the Singalila trailhead with hot meals and gear storage.", 1500, 2, 4.1, ["Hot meals", "Hot water", "Gear storage"], "Maneybhanjang", 27.0173, 88.1109],
  ["siliguri", "NJP Gateway Suites", "Business hotel", "Comfortable rooms 10 minutes from NJP and Bagdogra — perfect for early departures.", 2800, 3, 4.3, ["Free WiFi", "Breakfast", "Airport pickup", "24h desk"], "Sevoke Road", 26.7164, 88.4199],
];

const COMMON_INC = ["Accommodation", "Daily breakfast & dinner", "Private cab for all sightseeing", "Permits & taxes", "24×7 gowayy trip support"];
type P = [string, string, string, string, PoolKey, number, string[], string[], string, string, boolean, [string, string][]];
const PKG: P[] = [
  ["darjeeling-classic", "Darjeeling Classic", "Hill station", "The definitive first trip: Tiger Hill sunrise, the toy train, tea estates and Mall Road evenings.", "tea", 14999 - 6000, ["darjeeling"], ["Tiger Hill sunrise", "Toy train joy ride", "Tea tasting", "Ghum Monastery"], "Easy", "2–8 people", true, [["Arrive NJP → Darjeeling", "Pickup at NJP or Bagdogra and a scenic 3-hour climb through Kurseong. Evening stroll on Mall Road."], ["Tiger Hill, Ghum & Batasia", "Pre-dawn Kanchenjunga sunrise, Ghum Monastery, Batasia Loop and the War Memorial."], ["Toy train, zoo & tea", "DHR steam joy ride, Padmaja Naidu Zoo, HMI and a Happy Valley tea tasting."], ["Departure", "Breakfast, last-minute shopping at the tea emporium and transfer to NJP / Bagdogra."]]],
  ["darjeeling-kalimpong", "Darjeeling & Kalimpong Escape", "Hill station", "Two iconic hill towns linked by the Teesta valley drive.", "gompa", 18499, ["darjeeling", "kalimpong"], ["Tiger Hill", "Teesta valley drive", "Deolo Hill", "Orchid nurseries"], "Easy", "2–10 people", true, [["Arrive in Darjeeling", "Pickup at NJP, check-in, Chowrasta evening."], ["Sunrise & sightseeing", "Tiger Hill, Ghum Monastery, Batasia Loop."], ["Tea & Peace Pagoda", "Happy Valley, Peace Pagoda and the toy train."], ["Drive to Kalimpong", "Scenic Teesta river road and Zong Dog Palri Monastery."], ["Kalimpong & departure", "Deolo Hill, orchid nurseries, cheese shopping and drop to NJP."]]],
  ["sandakphu-trek", "Sandakphu Singalila Trek", "Trek", "Walk the Singalila ridge to see Everest, Lhotse, Makalu and Kanchenjunga together.", "peaks", 16999, ["sandakphu", "darjeeling"], ["Sleeping Buddha view", "Rhododendron forests", "Guide & porters", "Trekker lodges"], "Moderate", "4–12 people", true, [["Darjeeling → Maneybhanjang", "Drive to the trailhead, permits and briefing."], ["Maneybhanjang → Tumling", "Steady 11 km climb through forests."], ["Tumling → Kalipokhri", "Ridge walking with first big peak views."], ["Kalipokhri → Sandakphu", "Final ascent to 3,636 m for sunset."], ["Sunrise & descent", "Sunrise over four of the five highest peaks, then trek down."], ["Return to Darjeeling", "Drive back and celebrate with momos."]]],
  ["lava-lolegaon-weekend", "Lava & Lolegaon Weekend", "Offbeat", "Escape the crowds with monastery mornings, canopy walks and cloud-level cottages.", "tea", 9999, ["lava-lolegaon", "kalimpong"], ["Canopy walk", "Neora Valley", "Bonfire nights", "Local cuisine"], "Easy", "2–8 people", false, [["Arrive Lava", "Drive from NJP via Kalimpong, check into a cottage."], ["Lolegaon & Neora Valley", "Canopy walk at sunrise, then forest trails."], ["Kalimpong & departure", "Deolo Hill and drop to NJP."]]],
  ["tea-trail", "Darjeeling Tea Trail", "Tea & culture", "Stay in estate bungalows and follow tea from bush to cup.", "tea", 15999, ["kurseong", "mirik", "darjeeling"], ["Makaibari walk", "Mirik Lake", "Estate stays", "Tasting flights"], "Easy", "2–6 people", false, [["NJP → Kurseong", "Estate walk at Makaibari and silver-tips tasting."], ["Mirik day", "Sumendu Lake, Bokar Monastery and orange orchards."], ["Darjeeling tea", "Happy Valley and a private first-flush tasting."], ["Departure", "Gift shopping and transfer to NJP."]]],
  ["darjeeling-gangtok", "Darjeeling + Gangtok Duo", "Hill station", "Two capitals of the hills: heritage Darjeeling and cosmopolitan Gangtok.", "city", 24999, ["darjeeling", "gangtok"], ["Tiger Hill", "Rumtek Monastery", "MG Marg", "Tsomgo Lake"], "Easy", "2–10 people", true, [["Arrive Darjeeling", "Pickup at NJP and Mall Road walk."], ["Tiger Hill & toy train", "Sunrise, Ghum and DHR joy ride."], ["Drive to Gangtok", "Scenic drive via Teesta; evening on MG Marg."], ["Tsomgo Lake", "Full-day trip to the glacial lake."], ["Rumtek & monasteries", "Rumtek, Enchey Monastery and local markets."], ["Departure", "Transfer to NJP / Bagdogra."]]],
  ["sikkim-grand", "Pelling, Gangtok & Darjeeling Grand", "Circuit", "The complete Eastern Himalaya circuit in one seamless journey.", "gompa", 32999, ["pelling", "gangtok", "darjeeling"], ["Skywalk", "Pemayangtse", "Tsomgo Lake", "Tiger Hill"], "Easy", "2–10 people", false, [["Arrive Pelling", "Transfer from Bagdogra with Kanchenjunga sunset."], ["Pelling sightseeing", "Pemayangtse Monastery, Skywalk and Rabdentse ruins."], ["Pelling → Gangtok", "Scenic drive and MG Marg evening."], ["Gangtok day", "Rumtek Monastery and Tsomgo Lake."], ["Gangtok → Darjeeling", "Drive to Darjeeling via Teesta."], ["Tiger Hill & departure", "Sunrise at Tiger Hill and transfer to NJP."]]],
  ["himalayan-honeymoon", "Himalayan Honeymoon", "Romantic", "Candlelight dinners, valley-view suites and private cab touring.", "peaks", 27999, ["darjeeling", "kalimpong"], ["Candlelight dinner", "Couple spa", "Private cab", "Photo session"], "Easy", "Couples", true, [["Welcome to Darjeeling", "Flower welcome and a romantic Mall Road evening."], ["Sunrise & tea", "Tiger Hill, Happy Valley and a private tea tasting."], ["Toy train & candlelight", "Private steam ride and candlelight dinner."], ["Kalimpong", "Teesta drive, orchid nurseries and Deolo Hill sunset."], ["Departure", "Late brunch and transfer to NJP."]]],
];

const CABS: [string, string, string, string, number, number, number, number][] = [
  ["bike", "Hill Bike", "Royal Enfield / Pulsar", "🏍️", 1, 30, 10, 4],
  ["hatchback", "Hatchback", "WagonR · Alto", "🚗", 4, 150, 16, 8],
  ["sedan", "Sedan", "Dzire · Aura", "🚘", 4, 200, 19, 10],
  ["suv", "Hill SUV", "Bolero · Scorpio · Sumo", "🛻", 6, 300, 24, 12],
  ["innova", "Premium Innova", "Innova Crysta", "🚐", 6, 400, 30, 15],
  ["tempo", "Tempo Traveller", "12-seater", "🚌", 12, 600, 38, 25],
];

type V = [string, string, string, string, string, string, string, PoolKey, number, number, number, number, string[]];
const VEND: V[] = [
  // slug, kind, dest, name, tagline, description, area, img, imgIdx, eta, minOrder, fee, cuisines
  ["chowrasta-fresh-mart", "grocery", "darjeeling", "Chowrasta Fresh Mart", "Hill-fresh produce in 10 min", "Daily vegetables, dairy and essentials sourced from nearby farms.", "Chowrasta", "grocery", 0, 10, 99, 20, ["Fresh", "Dairy", "Essentials"]],
  ["hill-kart", "grocery", "darjeeling", "Hill Kart Supermarket", "Everything for your stay", "Staples, snacks, beverages and rain gear for visitors and locals.", "Mall Road", "grocery", 1, 15, 149, 25, ["Staples", "Snacks", "Essentials"]],
  ["kalimpong-organic-bazaar", "grocery", "kalimpong", "Kalimpong Organic Bazaar", "Organic from the valley", "Organic produce, local cheese and dairy from Kalimpong farms.", "Main Market", "veg", 0, 15, 99, 20, ["Organic", "Dairy"]],
  ["mirik-daily-needs", "grocery", "mirik", "Mirik Daily Needs", "Lakeside provisions", "Neighbourhood store with fresh bread, eggs and snacks.", "Mirik Bazaar", "grocery", 2, 18, 99, 25, ["Daily needs"]],
  ["kurseong-valley-provisions", "grocery", "kurseong", "Kurseong Valley Provisions", "Station-road staples", "Fresh vegetables and pantry staples for homestays and travellers.", "Station Road", "veg", 1, 18, 99, 25, ["Staples", "Fresh"]],
  ["siliguri-metro-mart", "grocery", "siliguri", "Siliguri Metro Mart", "Stock up before the climb", "Large-format store near NJP — road-trip snacks, water and medicines.", "Sevoke Road", "grocery", 2, 20, 199, 30, ["Supermarket", "Snacks"]],
  ["gangtok-himalayan-grocers", "grocery", "gangtok", "Gangtok Himalayan Grocers", "Sikkim fresh & organic", "Organic Sikkim vegetables, cardamom and daily groceries.", "Tadong", "veg", 3, 15, 99, 25, ["Organic", "Fresh"]],
  ["momo-mountain-kitchen", "restaurant", "darjeeling", "Momo Mountain Kitchen", "Tibetan comfort food", "Steaming momos, thukpa and Tibetan classics from a family kitchen.", "Chowrasta", "momo", 0, 25, 150, 30, ["Tibetan", "Momos", "Noodles"]],
  ["tea-room-cafe", "restaurant", "darjeeling", "The Tea Room Café", "High tea, bakes & brews", "Heritage café with first-flush tea, scones and sandwiches.", "Mall Road", "cafe", 0, 25, 150, 30, ["Café", "Bakery", "Tea"]],
  ["thakali-kitchen", "restaurant", "darjeeling", "Thakali Kitchen", "Nepali thali, home style", "Authentic Dal Bhat and Nepali thalis with gundruk and sel roti.", "Ghum", "thali", 1, 30, 200, 30, ["Nepali", "Thali"]],
  ["kalimpong-kafe", "restaurant", "kalimpong", "Kalimpong Kafe & Bakes", "Cheese, coffee, sunsets", "A bakery café famous for local cheese toasts and brownies.", "Main Market", "cafe", 1, 25, 150, 25, ["Café", "Cheese", "Dessert"]],
  ["lakeside-tibetan", "restaurant", "mirik", "Lakeside Tibetan Café", "Momos by the lake", "Warm Tibetan fare a stone's throw from Sumendu Lake.", "Sumendu Lake", "momo", 1, 25, 120, 25, ["Tibetan", "Momos"]],
  ["lava-pine-dhaba", "restaurant", "lava-lolegaon", "Lava Pine Dhaba", "Mountain meals", "Hearty home-style meals for trekkers and families.", "Lava", "thali", 2, 35, 120, 40, ["North Indian", "Snacks"]],
  ["siliguri-biryani-house", "restaurant", "siliguri", "Siliguri Biryani House", "Dum biryani since 1998", "Slow-cooked biryani and kebabs near NJP.", "Hill Cart Road", "thali", 3, 30, 200, 30, ["Biryani", "Kebabs"]],
  ["gangtok-skyline-dine", "restaurant", "gangtok", "Gangtok Skyline Dine", "Sikkimese kitchen", "Local Sikkimese dishes with a view over MG Marg.", "MG Marg", "momo", 2, 30, 200, 30, ["Sikkimese", "Tibetan"]],
  ["kurseong-chai-adda", "restaurant", "kurseong", "Kurseong Chai Adda", "Chai & snacks", "Roadside chai, pakoras and rolls that every traveller stops for.", "Station Road", "cafe", 2, 20, 80, 20, ["Chai", "Snacks"]],
  ["himalayan-tea-emporium", "shop", "darjeeling", "Himalayan Tea Emporium", "Estate-fresh Darjeeling teas", "Direct-from-estate flushes, tasting sessions and gift tins.", "Chowrasta", "teacup", 0, 30, 0, 40, ["Tea", "Gifts"]],
  ["tibetan-craft-bazaar", "shop", "darjeeling", "Tibetan Craft Bazaar", "Handmade Himalayan crafts", "Singing bowls, prayer flags, thangkas and yak-wool shawls.", "Mall Road", "craft", 0, 40, 0, 50, ["Crafts", "Souvenirs"]],
  ["kalimpong-cheese-and-orchids", "shop", "kalimpong", "Kalimpong Cheese & Orchids", "Local flavours, local blooms", "Farmhouse cheese, orchids and handloom scarves.", "Main Market", "craft", 1, 35, 0, 40, ["Cheese", "Orchids"]],
  ["lepcha-weaves-studio", "shop", "kalimpong", "Lepcha Weaves Studio", "Handloom by Lepcha artisans", "Traditional weaves, bamboo craft and weaving workshops.", "Rinkingpong", "craft", 2, 45, 0, 50, ["Handloom", "Workshops"]],
  ["makaibari-boutique", "shop", "kurseong", "Makaibari Tea Boutique", "Biodynamic estate teas", "World-renowned silver tips and organic honey from the estate.", "Makaibari", "tea", 3, 40, 0, 40, ["Tea", "Honey"]],
  ["gangtok-thangka-gallery", "shop", "gangtok", "Gangtok Thangka Gallery", "Sikkim crafts & spices", "Thangka art, large cardamom and Sikkim teas.", "MG Marg", "craft", 3, 40, 0, 50, ["Art", "Spices"]],
];

// groceries: name, emoji, price, mrp, unit, category, veg, tag
type G = [string, string, number, number, string, string, boolean, string];
const GROCERY: G[] = [
  ["Hill Tomatoes", "🍅", 40, 50, "500 g", "Fresh produce", true, ""],
  ["Baby Potatoes", "🥔", 35, 40, "1 kg", "Fresh produce", true, ""],
  ["Fresh Spinach", "🥬", 30, 35, "250 g", "Fresh produce", true, ""],
  ["Himalayan Carrots", "🥕", 45, 55, "500 g", "Fresh produce", true, ""],
  ["Broccoli", "🥦", 65, 80, "1 pc", "Fresh produce", true, ""],
  ["Green Chillies", "🌶️", 20, 25, "100 g", "Fresh produce", true, ""],
  ["Bananas", "🍌", 60, 70, "6 pcs", "Fresh produce", true, ""],
  ["Mountain Apples", "🍎", 140, 170, "1 kg", "Fresh produce", true, "Bestseller"],
  ["Darjeeling Oranges", "🍊", 120, 140, "1 kg", "Fresh produce", true, "Seasonal"],
  ["Strawberries", "🍓", 129, 160, "250 g", "Fresh produce", true, ""],
  ["Farm Fresh Milk", "🥛", 32, 34, "500 ml", "Dairy & eggs", true, "Bestseller"],
  ["Fresh Paneer", "🧀", 95, 110, "200 g", "Dairy & eggs", true, ""],
  ["Farm Eggs", "🥚", 84, 96, "12 pcs", "Dairy & eggs", false, ""],
  ["Salted Butter", "🧈", 58, 62, "100 g", "Dairy & eggs", true, ""],
  ["Thick Curd", "🥣", 45, 50, "400 g", "Dairy & eggs", true, ""],
  ["Whole Wheat Bread", "🍞", 48, 52, "400 g", "Bakery", true, "Fresh today"],
  ["Butter Croissant", "🥐", 55, 65, "1 pc", "Bakery", true, ""],
  ["Pav Buns", "🥖", 30, 32, "6 pcs", "Bakery", true, ""],
  ["Oat Cookies", "🍪", 90, 110, "200 g", "Bakery", true, ""],
  ["Basmati Rice", "🍚", 135, 160, "1 kg", "Staples", true, ""],
  ["Whole Wheat Atta", "🌾", 260, 290, "5 kg", "Staples", true, ""],
  ["Toor Dal", "🫘", 160, 180, "1 kg", "Staples", true, ""],
  ["Mustard Oil", "🫒", 190, 210, "1 L", "Staples", true, ""],
  ["Instant Noodles", "🍜", 14, 15, "70 g", "Snacks", true, "Trekker pick"],
  ["Namkeen Mix", "🥜", 60, 70, "200 g", "Snacks", true, ""],
  ["Dark Chocolate", "🍫", 120, 130, "100 g", "Snacks", true, ""],
  ["Darjeeling Tea Leaf", "🍵", 180, 200, "250 g", "Beverages", true, "Local"],
  ["Filter Coffee", "☕", 240, 270, "100 g", "Beverages", true, ""],
  ["Mineral Water", "💧", 20, 20, "1 L", "Beverages", true, ""],
  ["Mixed Fruit Juice", "🧃", 99, 110, "1 L", "Beverages", true, ""],
  ["Chicken Curry Cut", "🍗", 240, 270, "500 g", "Meat & fish", false, ""],
  ["Fresh Rohu", "🐟", 220, 250, "500 g", "Meat & fish", false, ""],
  ["Rain Poncho", "☔", 149, 199, "1 pc", "Hill essentials", true, "Must-have"],
  ["Woollen Socks", "🧦", 199, 249, "1 pair", "Hill essentials", true, ""],
  ["Hand Warmers", "🔥", 99, 120, "Pack of 4", "Hill essentials", true, ""],
  ["Toothpaste", "🪥", 85, 95, "150 g", "Hill essentials", true, ""],
];

// restaurants: vendor slug → items [name, emoji, price, category, veg, imgKey|'' , tag]
type R = [string, string, number, string, boolean, PoolKey | "", string];
const MENU: Record<string, R[]> = {
  "momo-mountain-kitchen": [
    ["Steamed Chicken Momo (8 pcs)", "🥟", 140, "Momos", false, "momo", "Bestseller"],
    ["Steamed Veg Momo (8 pcs)", "🥟", 110, "Momos", true, "momo", ""],
    ["Jhol Momo", "🍲", 160, "Momos", false, "momo", "Chef's pick"],
    ["Kothey Fried Momo", "🥟", 150, "Momos", false, "momo", ""],
    ["Chicken Thukpa", "🍜", 180, "Soups & noodles", false, "", ""],
    ["Veg Thukpa", "🍜", 150, "Soups & noodles", true, "", ""],
    ["Shaphale", "🥙", 130, "Tibetan", false, "", ""],
  ],
  "tea-room-cafe": [
    ["Darjeeling First Flush Pot", "🫖", 220, "Tea & coffee", true, "teacup", "Signature"],
    ["Cheese Omelette Sandwich", "🥪", 190, "Bites", false, "cafe", ""],
    ["Blueberry Muffin", "🧁", 120, "Bakes", true, "cafe", ""],
    ["Scones with Jam & Cream", "🥐", 180, "Bakes", true, "cafe", "Bestseller"],
    ["Hot Chocolate", "☕", 160, "Tea & coffee", true, "", ""],
    ["Warm Apple Pie", "🥧", 150, "Bakes", true, "", ""],
  ],
  "thakali-kitchen": [
    ["Veg Thali", "🍛", 260, "Thali", true, "thali", "Bestseller"],
    ["Chicken Thali", "🍛", 320, "Thali", false, "thali", ""],
    ["Dal Bhat Tarkari", "🍚", 220, "Thali", true, "thali", ""],
    ["Sel Roti (4 pcs)", "🍩", 100, "Sides", true, "", ""],
    ["Gundruk Soup", "🥣", 120, "Sides", true, "", ""],
    ["Aloo Dum", "🥔", 140, "Sides", true, "", ""],
  ],
  "kalimpong-kafe": [
    ["Kalimpong Cheese Toast", "🧀", 170, "Bites", true, "cafe", "Local fave"],
    ["Grilled Chicken Sandwich", "🥪", 200, "Bites", false, "cafe", ""],
    ["Cappuccino", "☕", 130, "Tea & coffee", true, "", ""],
    ["Walnut Brownie", "🍫", 150, "Dessert", true, "cafe", "Bestseller"],
    ["Pasta Alfredo", "🍝", 260, "Mains", true, "", ""],
  ],
  "lakeside-tibetan": [
    ["Pork Momo (8 pcs)", "🥟", 180, "Momos", false, "momo", ""],
    ["Fried Chicken Momo", "🥟", 190, "Momos", false, "momo", "Bestseller"],
    ["Chicken Thukpa", "🍜", 190, "Soups & noodles", false, "", ""],
    ["Phagshapa", "🥘", 280, "Tibetan", false, "", ""],
    ["Lemon Honey Tea", "🍋", 50, "Tea & coffee", true, "", ""],
  ],
  "lava-pine-dhaba": [
    ["Rajma Chawal", "🍛", 180, "Meals", true, "thali", ""],
    ["Chicken Curry Rice", "🍗", 240, "Meals", false, "thali", "Bestseller"],
    ["Egg Maggi", "🍜", 120, "Snacks", false, "", ""],
    ["Masala Chai", "🍵", 40, "Tea & coffee", true, "", ""],
    ["Aloo Paratha", "🫓", 110, "Meals", true, "", ""],
  ],
  "siliguri-biryani-house": [
    ["Chicken Dum Biryani", "🍛", 280, "Biryani", false, "thali", "Bestseller"],
    ["Mutton Biryani", "🍛", 360, "Biryani", false, "thali", ""],
    ["Veg Biryani", "🍛", 220, "Biryani", true, "thali", ""],
    ["Kebab Platter", "🍢", 320, "Starters", false, "", ""],
    ["Phirni", "🍮", 90, "Dessert", true, "", ""],
  ],
  "gangtok-skyline-dine": [
    ["Gyathuk Noodle Soup", "🍜", 210, "Soups & noodles", false, "momo", ""],
    ["Sael Roti & Aloo", "🥔", 150, "Sikkimese", true, "", ""],
    ["Chhurpi Soup", "🥣", 180, "Sikkimese", true, "", "Local"],
    ["Fried Momo (8 pcs)", "🥟", 160, "Momos", false, "momo", "Bestseller"],
    ["Sikkim Tea", "🍵", 80, "Tea & coffee", true, "", ""],
  ],
  "kurseong-chai-adda": [
    ["Masala Chai", "🍵", 40, "Chai", true, "", "Bestseller"],
    ["Pakora Basket", "🍤", 110, "Snacks", true, "", ""],
    ["Egg Roll", "🌯", 90, "Snacks", false, "", ""],
    ["Samosa (2 pcs)", "🥟", 40, "Snacks", true, "", ""],
    ["Jalebi", "🍥", 80, "Dessert", true, "", ""],
  ],
};

// shops: slug → [name, emoji, price, mrp, unit, category, imgKey|'', experience?, desc]
type S = [string, string, number, number, string, string, PoolKey | "", boolean, string];
const SHOPS: Record<string, S[]> = {
  "himalayan-tea-emporium": [
    ["First Flush Darjeeling", "🍃", 650, 720, "100 g", "Tea", "teacup", false, "Spring-picked muscatel notes."],
    ["Second Flush Darjeeling", "🍂", 520, 580, "100 g", "Tea", "tea", false, "Amber cup with ripe fruit notes."],
    ["Muscatel Reserve", "🏆", 890, 990, "100 g", "Tea", "teacup", false, "Limited estate reserve."],
    ["Gift Tin Set (3 teas)", "🎁", 1450, 1700, "3 × 50 g", "Gifts", "", false, "A premium tin trio for gifting."],
    ["Tea Tasting Session", "☕", 799, 999, "per person", "Experiences", "teacup", true, "A guided 60-minute tasting of five flushes."],
    ["Estate Plucking Walk", "🌱", 1199, 1499, "per person", "Experiences", "tea", true, "Pluck leaves with estate workers and brew your own cup."],
  ],
  "tibetan-craft-bazaar": [
    ["Prayer Flags Set", "🎏", 199, 249, "5 strings", "Souvenirs", "craft", false, "Hand-printed cotton flags."],
    ["Tibetan Singing Bowl", "🔔", 1299, 1599, "1 pc", "Souvenirs", "craft", false, "Hand-hammered with mallet."],
    ["Mini Thangka Painting", "🖼️", 2499, 2999, "1 pc", "Art", "craft", false, "Mineral pigments on cotton."],
    ["Yak Wool Shawl", "🧣", 1899, 2299, "1 pc", "Apparel", "craft", false, "Soft, warm and ethically sourced."],
    ["Thangka Painting Workshop", "🎨", 1499, 1799, "per person", "Experiences", "craft", true, "Paint your own mini thangka with a master artist."],
  ],
  "kalimpong-cheese-and-orchids": [
    ["Kalimpong Farmhouse Cheese", "🧀", 380, 420, "250 g", "Food", "", false, "Aged on the hills of Kalimpong."],
    ["Dendrobium Orchid Plant", "🌸", 650, 750, "1 plant", "Plants", "", false, "Healthy potted orchid with care card."],
    ["Cactus Pot", "🌵", 249, 299, "1 pot", "Plants", "", false, "Hand-selected hardy cactus."],
    ["Handloom Scarf", "🧣", 899, 1099, "1 pc", "Apparel", "craft", false, "Woven locally in soft cotton."],
    ["Orchid Nursery Tour", "🌺", 399, 499, "per person", "Experiences", "tea", true, "Private walk-through of rare orchid greenhouses."],
  ],
  "lepcha-weaves-studio": [
    ["Lepcha Handloom Stole", "🧶", 1299, 1599, "1 pc", "Apparel", "craft", false, "Traditional Lepcha weave."],
    ["Bamboo Basket", "🧺", 449, 549, "1 pc", "Home", "", false, "Woven bamboo basket."],
    ["Dumyang Wool Cap", "🧢", 349, 399, "1 pc", "Apparel", "", false, "Warm woollen cap."],
    ["Lepcha Weaving Workshop", "🪡", 999, 1299, "per person", "Experiences", "craft", true, "Try the backstrap loom with artisan weavers."],
  ],
  "makaibari-boutique": [
    ["Silver Tips Imperial", "🍵", 2200, 2500, "100 g", "Tea", "teacup", false, "World-famous silver tips."],
    ["Organic Himalayan Honey", "🍯", 350, 399, "350 g", "Food", "", false, "Raw forest honey."],
    ["Estate Tea Walk & Tasting", "🌿", 1500, 1800, "per person", "Experiences", "tea", true, "Biodynamic estate walk with tea tasting."],
  ],
  "gangtok-thangka-gallery": [
    ["Sikkim Large Cardamom", "🫚", 280, 320, "100 g", "Spices", "", false, "Smoky Sikkim cardamom."],
    ["Sikkim Temi Tea", "🍃", 400, 450, "100 g", "Tea", "teacup", false, "Sikkim's single-estate tea."],
    ["Fine Art Thangka", "🖼️", 4999, 5999, "1 pc", "Art", "craft", false, "Gold-leaf traditional thangka."],
    ["Private Gallery Walk", "🏛️", 499, 599, "per person", "Experiences", "craft", true, "A curator-led walk through the gallery."],
  ],
};

// ---------- CATALOGUE ADDITIONS ----------
// Added after launch, so they're applied idempotently to new *and* existing
// databases (matched by vendor slug / vendor + dish name). Bump CATALOG_VERSION
// whenever this list changes and the next start-up applies it once.
const CATALOG_VERSION = "2026-11-26.real-photos-2";

const EXTRA_VENDORS = [
  {
    slug: "slice-of-the-hills", kind: "restaurant", dest: "darjeeling", name: "Slice of the Hills", tagline: "Wood-fired pizza on Mall Road",
    description: "Hand-stretched sourdough pizzas from a wood-fired oven, plus fiery bites for cold hill evenings.", area: "Mall Road",
    image: "/media/vendor/slice-of-the-hills.webp", rating: 4.6, etaMins: 30, minOrder: 199, deliveryFee: 30, cuisines: ["Pizza", "Italian", "Spicy"],
  },
];

// vendor slug → [name, emoji, price, mrp, category, veg, image, tag, description]
type X = [string, string, number, number, string, boolean, string, string, string];
const EXTRA_MENU: Record<string, X[]> = {
  "slice-of-the-hills": [
    ["Classic Margherita Pizza", "🍕", 299, 369, "Pizza", true, "/media/food/pizza-margherita.webp", "Bestseller", "San Marzano tomato, fresh mozzarella and basil on a blistered wood-fired crust."],
    ["Fiery Jalapeño Chicken Pizza", "🌶️", 399, 489, "Pizza", false, "/media/food/pizza-jalapeno.webp", "Spicy", "Spicy peri-peri chicken, jalapeños and red chilli flakes over mozzarella."],
    ["Smoked Pork Sausage Pizza", "🍕", 429, 499, "Pizza", false, "/media/food/pizza-sausage.webp", "", "Smoked hill-pork sausage, mozzarella and torn basil."],
    ["Farmhouse Tomato & Herb Pizza", "🍕", 329, 389, "Pizza", true, "/media/food/pizza-tomato.webp", "", "Roasted tomatoes, oregano, garlic oil and a little Kalimpong cheese."],
    ["Hot Garlic Chicken Wings", "🌶️", 249, 299, "Spicy", false, "/media/food/spicy-wings.webp", "Spicy", "Spicy wings glazed in hot garlic and dalle chilli, with a cooling dip."],
  ],
  "kalimpong-kafe": [
    ["Kalimpong Cheese Pizza", "🍕", 279, 329, "Pizza", true, "/media/food/pizza-margherita.webp", "Local fave", "Thin-crust pizza loaded with Kalimpong's own cheese and fresh basil."],
  ],
  "momo-mountain-kitchen": [
    ["Chilli Chicken (Dry)", "🌶️", 220, 250, "Spicy", false, "/media/food/chilli-chicken.webp", "Spicy", "Spicy wok-tossed chicken with dalle chilli, garlic and spring onion."],
  ],
  "siliguri-biryani-house": [
    ["Spicy Chicken Pakora", "🌶️", 180, 210, "Spicy", false, "/media/food/chicken-pakora.webp", "", "Spicy, crisp chicken fritters with green chilli and lemon."],
    ["Spicy Hyderabadi Chicken Biryani", "🍛", 299, 349, "Biryani", false, "/media/food/biryani.webp", "Spicy", "Spicy dum biryani layered with green chilli, mint and fried onions."],
  ],
};

async function addCatalogExtras(db: NodePgDatabase) {
  const dRows = await db.select({ id: destinations.id, slug: destinations.slug }).from(destinations);
  const dId = Object.fromEntries(dRows.map((d) => [d.slug, d.id]));
  const newVendors = EXTRA_VENDORS.filter((v) => dId[v.dest]).map(({ dest, ...v }) => ({ ...v, destinationId: dId[dest] }));
  if (newVendors.length) await db.insert(vendors).values(newVendors).onConflictDoNothing({ target: vendors.slug });
  const slugs = Object.keys(EXTRA_MENU);
  const vRows = await db.select({ id: vendors.id, slug: vendors.slug }).from(vendors).where(inArray(vendors.slug, slugs));
  if (!vRows.length) return;
  const names = [...new Set(Object.values(EXTRA_MENU).flatMap((items) => items.map((x) => x[0])))];
  const have = await db
    .select({ vendorId: products.vendorId, name: products.name })
    .from(products)
    .where(and(inArray(products.vendorId, vRows.map((v) => v.id)), inArray(products.name, names)));
  const known = new Set(have.map((h) => `${h.vendorId}|${h.name}`));
  const add = vRows.flatMap((v) =>
    EXTRA_MENU[v.slug]
      .filter((x) => !known.has(`${v.id}|${x[0]}`))
      .map((x) => ({
        vendorId: v.id, name: x[0], emoji: x[1], price: x[2], mrp: x[3], unit: "1 serving", category: x[4], veg: x[5], image: productPhoto(x[0]) ?? x[6], tag: x[7], description: x[8],
      })),
  );
  if (add.length) await db.insert(products).values(add);
}

/** The hotel's town and its best-known sights (the hero already shows the hotel). */
function hotelGallery(hotelSlug: string, destSlug: string): string[] | undefined {
  const sights = ATTR.filter((a) => a[0] === destSlug).map((a) => photo("attr", slugify(a[1])));
  const list = [photo("dest", destSlug), ...sights, photo("hotel", hotelSlug)].filter((x): x is string => !!x).slice(0, 3);
  return list.length === 3 ? list : undefined;
}

/**
 * Points every catalogue row that has a real local photo at it — new and
 * existing databases alike. Matching is by slug (or product name), so admin-
 * added items without a photo are left untouched. One bulk statement per table.
 */
async function applyPhotos(client: PoolClient) {
  const bySlug = async (table: string, kind: "dest" | "attr" | "pkg" | "vendor") => {
    const pairs = photoKeys(kind).map((k) => [k, photo(kind, k)] as const).filter((x): x is readonly [string, string] => !!x[1]);
    if (!pairs.length) return;
    await client.query(
      `update ${table} t set image = v.img from unnest($1::text[], $2::text[]) as v(slug, img)
       where t.slug = v.slug and t.image is distinct from v.img`,
      [pairs.map((x) => x[0]), pairs.map((x) => x[1])],
    );
  };
  await bySlug("destinations", "dest");
  await bySlug("attractions", "attr");
  await bySlug("packages", "pkg");
  await bySlug("vendors", "vendor");

  const { rows: hs } = await client.query<{ slug: string; dest: string }>(
    `select h.slug, d.slug as dest from hotels h join destinations d on d.id = h.destination_id`,
  );
  const hp = hs.flatMap((h) => {
    const img = photo("hotel", h.slug);
    return img ? [{ slug: h.slug, img, gal: hotelGallery(h.slug, h.dest) ?? null }] : [];
  });
  if (hp.length) {
    await client.query(
      `update hotels h set image = v.img, gallery = coalesce(v.gal, h.gallery)
       from jsonb_to_recordset($1::jsonb) as v(slug text, img text, gal text[])
       where h.slug = v.slug and (h.image is distinct from v.img or (v.gal is not null and h.gallery is distinct from v.gal))`,
      [JSON.stringify(hp)],
    );
  }

  const { rows: ps } = await client.query<{ name: string }>(`select distinct name from products`);
  const prod = ps.map((r) => [r.name, productPhoto(r.name)] as const).filter((x): x is readonly [string, string] => !!x[1]);
  if (prod.length) {
    const args = [prod.map((x) => x[0]), prod.map((x) => x[1])];
    await client.query(
      `update products p set image = v.img from unnest($1::text[], $2::text[]) as v(name, img)
       where p.name = v.name and p.image is distinct from v.img`,
      args,
    );
    // Past order lines keep a snapshot; fill in ones that only had an emoji.
    await client.query(
      `update order_items o set image = v.img from unnest($1::text[], $2::text[]) as v(name, img)
       where o.name = v.name and o.image = ''`,
      args,
    );
  }

  // Booking snapshots of cabs, stays and trips follow the new photos too.
  await client.query(
    `update bookings b set image = '/media/cab/' || c.slug || '.webp' from cab_types c
     where b.type = 'cab' and b.ref_id = c.id and c.slug = any($1::text[])`,
    [[...photoKeys("cab")]],
  );
  await client.query(`update bookings b set image = h.image from hotels h where b.type = 'hotel' and b.ref_id = h.id and h.image like '/media/%'`);
  await client.query(`update bookings b set image = p.image from packages p where b.type = 'package' and b.ref_id = p.id and p.image like '/media/%'`);
}

async function seedAll(db: NodePgDatabase) {
  // users
  await db.insert(users).values([
    { name: "gowayy admin", email: "admin@gowayy.in", phone: "9000000001", passwordHash: hashPassword("admin123"), role: "admin", wallet: 0, address: "gowayy HQ, Chowrasta, Darjeeling" },
    { name: "Aarav Sharma", email: "demo@gowayy.in", phone: "9000000002", passwordHash: hashPassword("demo1234"), role: "user", wallet: 3000, address: "Room 12, Mall Road, Darjeeling 734101" },
  ]);

  const dRows = await db
    .insert(destinations)
    .values(
      DEST.map((d, i) => ({
        slug: d[0], name: d[1], region: d[2], tagline: d[3], description: d[4], altitude: d[5], bestSeason: d[6],
        image: photo("dest", d[0]) ?? pick(d[7], d[8], 1400), rating: rate(i, 4.4), tags: d[9], featured: d[10], lat: d[11], lng: d[12],
      })),
    )
    .returning();
  const dId = Object.fromEntries(dRows.map((d) => [d.slug, d.id]));
  const dCoord = Object.fromEntries(dRows.map((d) => [d.slug, [d.lat, d.lng]]));

  await db.insert(locations).values(LOCS.map((l) => ({ destinationId: dId[l[0]], name: l[1], kind: l[2], lat: l[3], lng: l[4] })));

  const jit = (i: number) => ((i * 53) % 17) / 800 - 0.01;

  // Attractions and hotels each get their own map location: one insert for
  // all the locations, then one per table, matched back by kind + name.
  const locRows = await db
    .insert(locations)
    .values([
      ...ATTR.map((a, i) => ({
        destinationId: dId[a[0]], name: a[1], kind: "attraction", lat: a[9] ?? dCoord[a[0]][0] + jit(i), lng: a[10] ?? dCoord[a[0]][1] + jit(i + 5),
      })),
      ...HOTELS.map((h, i) => ({
        destinationId: dId[h[0]], name: h[1], kind: "hotel", lat: h[9] ?? dCoord[h[0]][0] + jit(i), lng: h[10] ?? dCoord[h[0]][1] + jit(i + 3),
      })),
    ])
    .returning({ id: locations.id, kind: locations.kind, name: locations.name });
  const locId = new Map(locRows.map((l) => [`${l.kind}|${l.name}`, l.id]));

  await db.insert(attractions).values(
    ATTR.map((a, i) => ({
      slug: slugify(a[1]), destinationId: dId[a[0]], name: a[1], category: a[2], description: a[3],
      image: photo("attr", slugify(a[1])) ?? pick(a[4], i, 1200), rating: rate(i, 4.3), entryFee: a[5], duration: a[6], timings: a[7], tip: a[8],
      locationId: locId.get(`attraction|${a[1]}`),
    })),
  );

  await db.insert(hotels).values(
    HOTELS.map((h, i) => ({
      slug: slugify(h[1]), destinationId: dId[h[0]], name: h[1], type: h[2], description: h[3],
      image: photo("hotel", slugify(h[1])) ?? pick("room", i, 1200),
      gallery: hotelGallery(slugify(h[1]), h[0]) ?? [pick("room", i + 1, 1000), pick("room", i + 2, 1000), pick("peaks", i, 1000)],
      pricePerNight: h[4], stars: h[5], rating: h[6], amenities: h[7], area: h[8], locationId: locId.get(`hotel|${h[1]}`),
    })),
  );

  await db.insert(packages).values(
    PKG.map((p, i) => ({
      slug: p[0], name: p[1], theme: p[2], description: p[3], image: photo("pkg", p[0]) ?? pick(p[4], i, 1400), days: p[11].length, price: p[5],
      destinationIds: p[6].map((s) => dId[s]), highlights: p[7], inclusions: COMMON_INC,
      itinerary: p[11].map((x, k) => ({ day: k + 1, title: x[0], desc: x[1] })),
      difficulty: p[8], groupSize: p[9], rating: rate(i, 4.4), featured: p[10],
    })),
  );

  await db.insert(cabTypes).values(
    CABS.map((c) => ({ slug: c[0], name: c[1], model: c[2], emoji: c[3], capacity: c[4], baseFare: c[5], perKm: c[6], etaMins: c[7] })),
  );

  // vendors
  const vRows = await db
    .insert(vendors)
    .values(
      VEND.map((v, i) => ({
        slug: v[0], kind: v[1], destinationId: dId[v[2]], name: v[3], tagline: v[4], description: v[5], area: v[6],
        image: photo("vendor", v[0]) ?? pick(v[7], v[8], 1000), rating: rate(i, 4.3), etaMins: v[9], minOrder: v[10], deliveryFee: v[11], cuisines: v[12],
      })),
    )
    .returning();
  const vId = Object.fromEntries(vRows.map((v) => [v.slug, v.id]));

  const prodRows: (typeof products.$inferInsert)[] = [];
  VEND.filter((v) => v[1] === "grocery").forEach((v, vi) => {
    GROCERY.forEach((p, i) => {
      if ((i + vi) % 4 === 0) return;
      const bump = (i * vi) % 3;
      prodRows.push({
        vendorId: vId[v[0]], name: p[0], emoji: p[1], price: p[2] + bump, mrp: Math.max(p[3], p[2] + bump), unit: p[4],
        category: p[5], veg: p[6], tag: p[7], image: productPhoto(p[0]) ?? "", description: `${p[0]} — ${p[4]}. Fresh stock from ${v[3]}.`,
      });
    });
  });
  for (const [slug, items] of Object.entries(MENU)) {
    items.forEach((p, i) => {
      prodRows.push({
        vendorId: vId[slug], name: p[0], emoji: p[1], price: p[2], mrp: Math.round(p[2] * 1.1), unit: "1 serving",
        category: p[3], veg: p[4], tag: p[6], image: productPhoto(p[0]) ?? (p[5] ? pick(p[5], i, 600) : ""),
        description: `${p[0]} prepared fresh to order.`,
      });
    });
  }
  for (const [slug, items] of Object.entries(SHOPS)) {
    items.forEach((p, i) => {
      prodRows.push({
        vendorId: vId[slug], name: p[0], emoji: p[1], price: p[2], mrp: p[3], unit: p[4], category: p[5],
        image: productPhoto(p[0]) ?? (p[6] ? pick(p[6], i, 600) : ""), isExperience: p[7], description: p[8],
      });
    });
  }
  await db.insert(products).values(prodRows);

  await db.insert(coupons).values([
    { code: "WELCOME100", description: "₹100 off on orders above ₹399", flat: 100, minAmount: 399, scope: "order" },
    { code: "HILLS10", description: "10% off bookings above ₹2,000 (max ₹600)", percent: 10, minAmount: 2000, maxDiscount: 600, scope: "booking" },
    { code: "GOWAYY15", description: "15% off trips above ₹5,000 (max ₹1,500)", percent: 15, minAmount: 5000, maxDiscount: 1500, scope: "booking" },
    { code: "FIRSTRIDE", description: "20% off bookings above ₹300 (max ₹300)", percent: 20, minAmount: 300, maxDiscount: 300, scope: "booking" },
  ]);
}
