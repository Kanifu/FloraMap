import { useGardenStore } from '@/store/gardenStore';
import { Tier, TIER_RANK, FREE_PLANT_LIMIT } from '@/constants/tiers';

export type { Tier };
export { TIER_RANK, FREE_PLANT_LIMIT };

export type FeatureKey =
  | 'unlimited_plants'
  | 'unlimited_ai'
  | 'photo_log_unlimited'
  | 'harvest_tracking'
  | 'moon_calendar'
  | 'dark_mode'
  | 'frost_notifications'
  | 'soil_health'
  | 'multi_garden'
  | 'pdf_export'
  | 'crop_rotation'
  | 'statistics'
  | 'all_achievements';

export interface FeatureConfig {
  requiredTier: Tier;
  label: string;
  description: string;
}

export const FEATURE_CONFIGS: Record<FeatureKey, FeatureConfig> = {
  unlimited_plants:    { requiredTier: 'plus',    label: 'Onbeperkt planten',       description: 'Voeg meer dan 20 planten toe aan je tuin' },
  unlimited_ai:        { requiredTier: 'plus',    label: 'Onbeperkte AI-assistent', description: 'Stel de AI-assistent onbeperkt vragen' },
  photo_log_unlimited: { requiredTier: 'plus',    label: "Onbeperkt foto's",         description: "Voeg onbeperkt foto's toe per plant" },
  harvest_tracking:    { requiredTier: 'plus',    label: 'Oogstdagboek',             description: 'Houd je oogstopbrengst bij per plant' },
  moon_calendar:       { requiredTier: 'plus',    label: 'Maankalender',             description: 'Plan zaai- en plantwerk op maanfasen' },
  dark_mode:           { requiredTier: 'plus',    label: 'Dark mode',                description: 'Schakel over naar een donker thema' },
  frost_notifications: { requiredTier: 'plus',    label: 'Vorstmeldingen',           description: 'Ontvang meldingen bij naderend vorstrisico' },
  soil_health:         { requiredTier: 'premium', label: 'Bodemgezondheid',          description: 'Bodemprofiel, pH en amendementenlog' },
  multi_garden:        { requiredTier: 'premium', label: 'Meerdere tuinen',          description: 'Beheer meerdere tuinen tegelijkertijd' },
  pdf_export:          { requiredTier: 'premium', label: 'PDF-export',               description: 'Exporteer je tuinrapport als PDF' },
  crop_rotation:       { requiredTier: 'premium', label: 'Gewasrotatie',             description: 'Volg gewasrotatie over meerdere seizoenen' },
  statistics:          { requiredTier: 'premium', label: 'Statistieken',             description: 'Seizoensdashboard en oogststatistieken' },
  all_achievements:    { requiredTier: 'premium', label: 'Alle prestaties',          description: 'Ontgrendel alle badges en wekelijkse digest' },
};

export const useFeatureFlag = (key: FeatureKey): { enabled: boolean; requiredTier: Tier; config: FeatureConfig } => {
  const userTier = useGardenStore((s) => s.userTier);
  const config = FEATURE_CONFIGS[key];
  const enabled = TIER_RANK[userTier] >= TIER_RANK[config.requiredTier];
  return { enabled, requiredTier: config.requiredTier, config };
};
