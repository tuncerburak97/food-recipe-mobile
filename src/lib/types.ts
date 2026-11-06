// Types mirror the recipe-backend API contract (internal/recipes/types.go, internal/instagram/models.go).

import type { CookProfile } from '@/lib/profile';

export type Category =
  | 'breakfast'
  | 'soup'
  | 'salad'
  | 'main'
  | 'side'
  | 'appetizer'
  | 'pasta'
  | 'rice'
  | 'bread'
  | 'pastry'
  | 'dessert'
  | 'snack'
  | 'sauce'
  | 'drink'
  | 'other';

export type Unit =
  | 'g' | 'kg' | 'mg' | 'ml' | 'l' | 'tsp' | 'dessertspoon' | 'tbsp' | 'cup' | 'tea_glass'
  | 'water_glass' | 'bowl' | 'piece' | 'clove' | 'slice' | 'pinch' | 'handful' | 'bunch'
  | 'sprig' | 'leaf' | 'can' | 'jar' | 'pack' | 'box' | 'bottle' | 'drop' | 'stick' | 'cube'
  | 'oz' | 'lb' | 'fl_oz' | 'pint' | 'quart' | 'other';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Heat = 'low' | 'medium_low' | 'medium' | 'medium_high' | 'high';

export interface Ingredient {
  name: string;
  original_text: string;
  quantity: number | null;
  quantity_max: number | null;
  unit: Unit | null;
  unit_text: string | null;
  preparation: string | null;
  optional: boolean;
  to_taste: boolean;
  notes: string | null;
}

export interface IngredientGroup {
  id: string;
  name: string;
  component: string;
  source: 'author' | 'inferred' | 'default';
  ingredients: Ingredient[];
}

export interface Step {
  order: number;
  text: string;
  group_id: string | null;
  duration_minutes: number | null;
  temperature_c: number | null;
  heat: Heat | null;
  /**
   * Where this step happens in the reel, in seconds (from what is said in the video). Null when the
   * video has no speech or the step cannot be placed. Older recipes do not have the fields.
   */
  video_start_sec?: number | null;
  video_end_sec?: number | null;
}

export interface Recipe {
  is_recipe: boolean;
  /**
   * ISO 639-1 code of the source (caption or speech), e.g. "en". The recipe itself is always written
   * in Turkish: a foreign source is translated and its measures adapted (see translatedLine).
   */
  language: string;
  title: string;
  title_source: 'text' | 'inferred';
  description: string | null;
  category: Category;
  cuisine: string | null;
  difficulty: Difficulty | null;
  servings: { amount: number | null; text: string | null };
  times: {
    prep_minutes: number | null;
    cook_minutes: number | null;
    rest_minutes: number | null;
    total_minutes: number | null;
  };
  ingredient_groups: IngredientGroup[];
  steps: Step[];
  equipment: string[];
  tips: string[];
  tags: string[];
  dietary: string[];
  missing_information: string[];
  /** Values the AI estimated because the video did not say them (shown as "yaklaşık"). */
  estimated?: EstimatedKey[];
  confidence: number;
}

export type EstimatedKey =
  | 'servings'
  | 'difficulty'
  | 'prep_minutes'
  | 'cook_minutes'
  | 'rest_minutes'
  | 'total_minutes'
  | 'step_durations';

export interface RecipeOutput {
  recipe: Recipe;
  model: string;
  prompt_version: string;
  data_source: 'database' | 'agent';
  created_at?: string;
  /** True when what is said in the video was used along with its caption. */
  listened?: boolean;
}

export interface ReelOwner {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  profile_url: string;
  is_verified: boolean;
  is_private: boolean;
}

export interface Reel {
  id: string;
  shortcode: string;
  url: string;
  is_video: boolean;
  taken_at: string;
  video?: {
    url: string;
    width: number;
    height: number;
    duration_sec: number;
    /** False for a silent reel: there is nothing to listen to. */
    has_audio?: boolean;
    thumbnail_url: string;
  };
  owner: ReelOwner;
  caption: { text: string; hashtags: string[]; mentions: string[] };
  stats: { likes: number; comments: number; plays: number; likes_hidden: boolean };
  data_source: 'instagram' | 'database';
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface FetchRecipeResponse extends Reel {
  recipe?: RecipeOutput;
  recipe_error?: ApiErrorBody;
}

// ---- users & recipe book (internal/store/users.go) ----

export interface ApiUser {
  id: number;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  recipe_count: number;
  profile: CookProfile | null;
  onboarded_at: string | null;
}

export type RecipeOrigin = 'instagram' | 'text' | 'ai' | 'voice';

/** Today's answers in the "Elimde ne var?" flow (recipe-backend internal/chef Request). */
export interface ChefRequest {
  ingredients: string[];
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'any';
  taste: 'sweet' | 'savory' | 'any';
  /** What the dish is for: a treat, an everyday plate, low calorie, or protein for training. */
  goal: 'indulgent' | 'balanced' | 'light' | 'high_protein' | 'any';
  /** Max kcal per serving; 0 = no limit. */
  calorie_limit: number;
  effort: 'quick' | 'normal' | 'project';
  mood: 'light' | 'hearty' | 'comfort' | 'healthy' | 'surprise' | 'any';
  servings: number;
  /** 0 = no limit. */
  max_minutes: number;
  pantry_mode: 'strict' | 'flexible' | 'shopping';
  note: string;
  avoid_titles: string[];
}

/** A recipe being prepared in the background (recipe-backend generation_jobs). */
/** A reel shared from Instagram, saved to the book in the background. */
export interface ReelImportRequest {
  kind: 'reel';
  url: string;
}

export interface GenerationJob {
  id: string;
  status: 'pending' | 'done' | 'failed';
  /** An AI chef request, or a reel import (kind "reel"). */
  request: ChefRequest | ReelImportRequest;
  title: string | null;
  entry_id: number | null;
  error: ApiErrorBody | null;
  created_at: string;
  finished_at: string | null;
  seen: boolean;
}

/** Stored with an AI recipe: what was asked and the personal note. */
export interface Generation {
  request: ChefRequest;
  personal_note: string;
  fit_reasons: string[];
  used_ingredients: string[];
  extra_ingredients: string[];
  /** Estimate for one serving. */
  nutrition?: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  warnings?: string[];
}

export interface ApiEntry {
  id: number;
  recipe_id: number;
  recipe: Recipe;
  image_url: string;
  source: {
    shortcode: string;
    url: string;
    owner_username: string;
    owner_full_name: string;
    owner_avatar_url: string;
    owner_verified: boolean;
    likes: number | null;
    plays: number;
    video_url?: string;
  } | null;
  added_by: { id: number; display_name: string; username: string | null; avatar_url: string | null };
  created_at: string;
  customized: boolean;
  custom_note: string | null;
  origin: RecipeOrigin;
  generation?: Generation | null;
  /** AI recipes: the background food photo ("pending" until it is ready). */
  image_status?: 'pending' | 'ready' | 'failed' | null;
  /** Recipes told out loud (origin "voice"): the recording (internal/store/voice.go EntryVoice). */
  voice?: { url: string; duration_sec: number | null; teller: string | null; waveform: number[] } | null;
}

export interface ApiPage {
  items: ApiEntry[];
  next_cursor?: string;
}

// ---- discovery (internal/store/discover.go, internal/pantry) ----

/** An Instagram account the saved recipes came from. */
export interface Creator {
  username: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
  recipe_count: number;
  /** Thumbnails of up to 3 of their newest recipes. */
  covers: string[];
  /** Where the account is (older servers send neither). */
  source?: 'instagram' | 'youtube';
  profile_url?: string;
}

export interface CategoryCount {
  category: Category;
  count: number;
}

// ---- app-side models ----

export interface AppUser {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  recipeCount?: number;
  profile?: CookProfile;
  onboarded?: boolean;
}

/** Where a recipe came from (the Instagram reel), kept small so it can be stored on the device. */
export interface RecipeSource {
  shortcode: string;
  url: string;
  ownerUsername: string;
  ownerFullName: string;
  ownerAvatarUrl?: string;
  ownerVerified: boolean;
  likes?: number;
  plays?: number;
  videoUrl?: string;
}

export interface RecipePage {
  items: RecipeEntry[];
  nextCursor?: string;
}

/** A recipe as shown in the app: the backend recipe plus who added it and its source reel. */
export interface RecipeEntry {
  id: string;
  recipe: Recipe;
  imageUrl: string;
  source?: RecipeSource;
  addedBy: AppUser;
  createdAt: string;
  /** True when this is the user's personal version made with the assistant. */
  customized?: boolean;
  customNote?: string;
  origin: RecipeOrigin;
  /** Set for recipes made from what the user has ("Elimde ne var?"). */
  generation?: Generation;
  imageStatus?: 'pending' | 'ready' | 'failed';
  /** Set for recipes told out loud ("Annemin tarifi"): the recording to replay. */
  voice?: RecipeVoice;
}

/** The recording of a recipe told out loud. `url` is absolute and needs authHeaders(). */
export interface RecipeVoice {
  url: string;
  durationSec?: number;
  /** Who tells it, as the user chose ("Annem"). */
  teller?: string;
  /** Loudness in up to 64 steps (0..1); empty when unknown. */
  waveform: number[];
}

// ---- cooking assistant ----

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantProposal {
  summary: string;
  changes: string[];
  recipe: Recipe;
}

export interface AssistantAnswer {
  reply: string;
  off_topic: boolean;
  suggestions: string[];
  proposal?: AssistantProposal;
}

export function isReelImport(req: GenerationJob['request']): req is ReelImportRequest {
  return (req as ReelImportRequest).kind === 'reel';
}

/** The ingredients of an AI chef job (none for a reel import). */
export function jobIngredients(job: GenerationJob): string[] {
  return isReelImport(job.request) ? [] : job.request.ingredients;
}
