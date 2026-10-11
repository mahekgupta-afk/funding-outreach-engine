export interface Thesis {
  id: string;
  name: string;
  is_active: boolean;
  accelerator_name: string;
  description: string;
  target_sectors: string[];
  excluded_sectors: string[];
  target_geographies: string[];
  stages: string[];
  min_round_usd: number | null;
  max_round_usd: number | null;
  fit_threshold: number;
  sender_name: string | null;
  sender_title: string | null;
  program_pitch: string | null;
  updated_at: string;
}
