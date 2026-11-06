import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { api, ApiError, type FeedParams } from '@/lib/api';
import type { CookProfile } from '@/lib/profile';
import type { Creator, GenerationJob, Recipe, RecipeEntry, RecipePage } from '@/lib/types';
import { useSession } from '@/store/session';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

/** The signed-in user. A rejected token starts again with a new guest account. */
export function useMe() {
  const { status, signOut } = useSession();
  const query = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: status === 'ready' || status === 'onboarding' });
  const invalid = query.error instanceof ApiError && (query.error.code === 'INVALID_TOKEN' || query.error.code === 'AUTH_REQUIRED');
  useEffect(() => {
    if (invalid) signOut();
  }, [invalid, signOut]);
  return query;
}

/** One page-by-page recipe feed (newest first). */
export function useFeed(params: FeedParams, options: { enabled?: boolean; limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['recipes', params, options.limit],
    queryFn: ({ pageParam }) => api.listRecipes({ ...params, cursor: pageParam || undefined, limit: options.limit }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor,
    enabled: options.enabled ?? true,
  });
}

export function useCreators(q?: string) {
  return useQuery({ queryKey: ['creators', q ?? ''], queryFn: () => api.listCreators(q) });
}

/** One Instagram account; starts from the list if it is already loaded. */
export function useCreator(username: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ['creator', username.toLowerCase()],
    queryFn: () => api.getCreator(username),
    initialData: () =>
      client
        .getQueryData<Creator[]>(['creators', ''])
        ?.find((c) => c.username.toLowerCase() === username.toLowerCase()),
    initialDataUpdatedAt: 0,
  });
}

/** The most used ingredients, for picking "içinde ne olsun?" in the assistant. */
export function usePopularIngredients(limit = 24) {
  return useQuery({ queryKey: ['ingredients', limit], queryFn: () => api.popularIngredients(limit), staleTime: 10 * 60_000 });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: api.categories });
}

/** Saves the user's name and cooking profile; the new answers shape the next AI recipes. */
export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { name: string; profile: CookProfile }) => api.saveProfile(v.name, v.profile, true),
    onSuccess: (user) => client.setQueryData(['me'], user),
  });
}

/** The user's background recipes. Polls every few seconds only while one is still being prepared. */
export function useGenerations() {
  const { status } = useSession();
  return useQuery({
    queryKey: ['generations'],
    queryFn: api.listGenerations,
    enabled: status === 'ready',
    refetchInterval: (q) => (q.state.data?.items.some((j) => j.status === 'pending') ? 4000 : false),
  });
}

/** Sends a recipe request; it is prepared in the background and shows up in useGenerations. */
export function useStartGeneration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.startGeneration,
    onSuccess: (job) => {
      client.setQueryData<{ items: GenerationJob[]; unseen: number }>(['generations'], (old) =>
        old ? { ...old, items: [job, ...old.items.filter((j) => j.id !== job.id)] } : { items: [job], unseen: 0 },
      );
      client.invalidateQueries({ queryKey: ['generations'] });
    },
  });
}

/** Starts a reel import; the job shows in the inbox (and is polled) at once. */
export function useImportRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.importRecipe,
    onSuccess: (job) => {
      client.setQueryData<{ items: GenerationJob[]; unseen: number }>(['generations'], (old) =>
        old ? { ...old, items: [job, ...old.items.filter((j) => j.id !== job.id)] } : { items: [job], unseen: 0 },
      );
      client.invalidateQueries({ queryKey: ['generations'] });
    },
  });
}

export function useMarkGenerationsSeen() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => api.markGenerationsSeen(ids),
    onSuccess: () => client.invalidateQueries({ queryKey: ['generations'] }),
  });
}

/** Finds an entry already loaded by a feed so the detail screen can render immediately. */
function findLoaded(client: QueryClient, id: string): RecipeEntry | undefined {
  for (const [, data] of client.getQueriesData<InfiniteData<RecipePage>>({ queryKey: ['recipes'] })) {
    const hit = data?.pages.flatMap((p) => p.items).find((e) => e.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useRecipe(id: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => api.getRecipe(id),
    initialData: () => findLoaded(client, id),
    initialDataUpdatedAt: 0, // still refetch in the background
    // The food photo of a new AI recipe arrives a little later; check again until it is there.
    refetchInterval: (q) => (q.state.data?.imageStatus === 'pending' ? 6000 : false),
  });
}

function refreshLists(client: QueryClient) {
  client.invalidateQueries({ queryKey: ['recipes'] });
  client.invalidateQueries({ queryKey: ['me'] });
  client.invalidateQueries({ queryKey: ['creators'] });
  client.invalidateQueries({ queryKey: ['creator'] });
  client.invalidateQueries({ queryKey: ['categories'] });
}

export function useSaveRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.saveRecipe,
    onSuccess: (entry) => {
      client.setQueryData(['recipe', entry.id], entry);
      refreshLists(client);
    },
  });
}

/** Applies an assistant proposal as the user's personal version. */
export function useSaveCustomRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { entryId: string; recipe: Recipe; note?: string }) => api.saveCustomRecipe(v.entryId, v.recipe, v.note),
    onSuccess: (entry) => {
      client.setQueryData(['recipe', entry.id], entry);
      refreshLists(client);
    },
  });
}

export function useResetCustomRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.resetCustomRecipe,
    onSuccess: (entry) => {
      client.setQueryData(['recipe', entry.id], entry);
      refreshLists(client);
    },
  });
}

export function useDeleteRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.deleteRecipe,
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: ['recipe', id] });
      refreshLists(client);
    },
  });
}
