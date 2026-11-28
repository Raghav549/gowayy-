// Explicit, idempotent initial CMS backfill; run with DATABASE_URL on a verified environment.
import pg from "pg";
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL or POSTGRES_URL required");
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const media = ["tours","cabs","stays","grocery","food","offers","pizza","spicy","momos","biryani","veggies","desserts","bakery","tea","shops"];
const names = ["Tours","Cabs","Stays","Grocery","Food","Best offers","Pizzas","Spicy","Momos","Biryani","Fresh veg","Desserts","Bakery","Chai & tea","Shops"];
const links = ["/tours","/cabs","/hotels","/grocery","/food","/offers","/food?cat=Pizza","/food?q=spicy","/food?cat=Momos","/food?cat=Biryani","/grocery?cat=Fresh+produce","/food?cat=Dessert","/grocery?cat=Bakery","/food?cat=Tea+%26+coffee","/shops"];
const rings=["from-brand-400 via-fuchsia-400 to-brand-700","from-amber-400 via-orange-400 to-brand-500","from-sky-400 via-indigo-400 to-brand-500","from-emerald-400 via-teal-400 to-brand-500","from-orange-400 via-rose-400 to-brand-500"];
try {
 await pool.query("BEGIN");
 for (let i=0;i<media.length;i++) await pool.query(`INSERT INTO gw_home_categories (id,label,href,image_url,ring,position) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`, ["category-"+i,names[i],links[i],"/media/cat/fun/"+media[i]+".webp",rings[i%rings.length],i]);
 await pool.query("COMMIT");
 console.log("CMS categories backfilled without overwriting existing admin edits.");
} catch(e){await pool.query("ROLLBACK"); throw e;} finally { await pool.end(); }
