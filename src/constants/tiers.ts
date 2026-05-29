export type Tier = 'free' | 'plus' | 'premium';
export const TIER_RANK: Record<Tier, number> = { free: 0, plus: 1, premium: 2 };
export const FREE_PLANT_LIMIT = 20;
