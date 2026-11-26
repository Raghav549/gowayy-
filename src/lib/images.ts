export const px = (id: number, w = 900) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const POOL = {
  peaks: [41192863, 12174800, 14658760],
  tea: [103875, 39337527, 35151733, 35151735, 35151736, 19082530],
  train: [31477804, 18943817, 33565206],
  gompa: [19877797, 5201146, 37845688, 28849374],
  room: [36678908, 34962016, 39333422, 30835932, 2346091],
  momo: [41076413, 18803177, 3926123, 38213587],
  veg: [37321079, 32465897, 5425794, 5425893],
  thali: [8148149, 32797056, 29148133, 36125185],
  craft: [36564691, 36564695, 36618861, 28837977],
  jeep: [39976461, 38115533, 34532539, 36874293],
  lake: [10366391, 31292192],
  teacup: [5190542, 7136271, 34026385],
  grocery: [19138180, 8805471, 8476592],
  cafe: [39065926, 11847639, 31672060, 31692609],
  city: [25311368, 14916663, 30156563],
} as const;

export type PoolKey = keyof typeof POOL;

export function pick(key: PoolKey, i = 0, w = 900) {
  const arr = POOL[key];
  return px(arr[i % arr.length], w);
}
