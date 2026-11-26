import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").default("").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("user").notNull(),
  wallet: integer("wallet").default(0).notNull(),
  address: text("address").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  altitude: text("altitude").notNull(),
  bestSeason: text("best_season").notNull(),
  rating: real("rating").default(4.5).notNull(),
  tags: text("tags").array().notNull().default([]),
  featured: boolean("featured").default(false).notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  destinationId: integer("destination_id").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const attractions = pgTable("attractions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  destinationId: integer("destination_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  rating: real("rating").default(4.5).notNull(),
  entryFee: integer("entry_fee").default(0).notNull(),
  duration: text("duration").notNull(),
  timings: text("timings").notNull(),
  tip: text("tip").notNull(),
  locationId: integer("location_id"),
});

export const hotels = pgTable("hotels", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  destinationId: integer("destination_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  gallery: text("gallery").array().notNull().default([]),
  pricePerNight: integer("price_per_night").notNull(),
  rating: real("rating").default(4.5).notNull(),
  stars: integer("stars").default(3).notNull(),
  amenities: text("amenities").array().notNull().default([]),
  area: text("area").notNull(),
  locationId: integer("location_id"),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  theme: text("theme").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  days: integer("days").notNull(),
  price: integer("price").notNull(),
  destinationIds: integer("destination_ids").array().notNull().default([]),
  highlights: text("highlights").array().notNull().default([]),
  inclusions: text("inclusions").array().notNull().default([]),
  itinerary: jsonb("itinerary").$type<{ day: number; title: string; desc: string }[]>().notNull(),
  difficulty: text("difficulty").notNull(),
  groupSize: text("group_size").notNull(),
  rating: real("rating").default(4.6).notNull(),
  featured: boolean("featured").default(false).notNull(),
});

export const cabTypes = pgTable("cab_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  model: text("model").notNull(),
  emoji: text("emoji").notNull(),
  capacity: integer("capacity").notNull(),
  baseFare: integer("base_fare").notNull(),
  perKm: integer("per_km").notNull(),
  etaMins: integer("eta_mins").notNull(),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  kind: text("kind").notNull(), // grocery | restaurant | shop
  destinationId: integer("destination_id").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  area: text("area").notNull(),
  rating: real("rating").default(4.5).notNull(),
  etaMins: integer("eta_mins").default(20).notNull(),
  minOrder: integer("min_order").default(0).notNull(),
  deliveryFee: integer("delivery_fee").default(25).notNull(),
  cuisines: text("cuisines").array().notNull().default([]),
  openNow: boolean("open_now").default(true).notNull(),
  locationId: integer("location_id"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default("").notNull(),
  image: text("image").default("").notNull(),
  emoji: text("emoji").default("🛍️").notNull(),
  price: integer("price").notNull(),
  mrp: integer("mrp").notNull(),
  unit: text("unit").default("").notNull(),
  category: text("category").notNull(),
  veg: boolean("veg").default(true).notNull(),
  available: boolean("available").default(true).notNull(),
  tag: text("tag").default("").notNull(),
  isExperience: boolean("is_experience").default(false).notNull(),
});

export const coupons = pgTable("coupons", {
  code: text("code").primaryKey(),
  description: text("description").notNull(),
  percent: integer("percent").default(0).notNull(),
  flat: integer("flat").default(0).notNull(),
  minAmount: integer("min_amount").default(0).notNull(),
  maxDiscount: integer("max_discount").default(0).notNull(),
  scope: text("scope").default("all").notNull(), // all | order | booking
  active: boolean("active").default(true).notNull(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    productId: integer("product_id").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [uniqueIndex("cart_user_product").on(t.userId, t.productId)],
);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  userId: integer("user_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  kind: text("kind").notNull(),
  status: text("status").default("placed").notNull(),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  discount: integer("discount").default(0).notNull(),
  total: integer("total").notNull(),
  address: text("address").notNull(),
  note: text("note").default("").notNull(),
  couponCode: text("coupon_code").default("").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull(),
  autoProgress: boolean("auto_progress").default(true).notNull(),
  riderName: text("rider_name").notNull(),
  riderPhone: text("rider_phone").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  image: text("image").default("").notNull(),
  price: integer("price").notNull(),
  qty: integer("qty").notNull(),
});

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull(),
  note: text("note").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  tripId: text("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // hotel | package | cab | experience
  refId: integer("ref_id").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").default("").notNull(),
  image: text("image").default("").notNull(),
  destinationId: integer("destination_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").default("").notNull(),
  guests: integer("guests").default(1).notNull(),
  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").default(0).notNull(),
  discount: integer("discount").default(0).notNull(),
  amount: integer("amount").notNull(),
  status: text("status").default("confirmed").notNull(),
  paymentStatus: text("payment_status").notNull(),
  paymentMethod: text("payment_method").notNull(),
  details: jsonb("details").$type<Record<string, string | number | boolean>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  kind: text("kind").notNull(), // order | booking | topup | refund | bonus
  refCode: text("ref_code").default("").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull(),
  txnId: text("txn_id").notNull(),
  provider: text("provider").default("gowayy-sandbox").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  kind: text("kind").default("info").notNull(),
  link: text("link").default("").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    kind: text("kind").notNull(),
    refId: integer("ref_id").notNull(),
  },
  (t) => [uniqueIndex("fav_unique").on(t.userId, t.kind, t.refId)],
);
