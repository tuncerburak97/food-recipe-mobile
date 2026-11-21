import { Alert, Share } from 'react-native';

import { openSignIn } from '@/lib/access';
import { track } from '@/lib/analytics';
import { api, ApiError } from '@/lib/api';
import type { RecipeEntry } from '@/lib/types';

/** The plain share from before links: the recipe's name and its source video. */
function shareBasic(entry: RecipeEntry) {
  const { recipe, source } = entry;
  return Share.share({ message: source ? `${recipe.title}\n${source.url}` : recipe.title });
}

/**
 * Shares a recipe as a link (https://<server>/t/<token>): whoever opens it sees the recipe and can
 * add it to their own book, also when it is a private AI or voice recipe. Links are for members,
 * so a guest is offered to sign in, or to send just the video link as before. A server from
 * before links falls back to the plain share.
 */
export async function shareRecipe(entry: RecipeEntry): Promise<void> {
  try {
    const link = await api.shareRecipe(entry.id);
    track('recipe_shared', { origin: entry.origin });
    await Share.share({ message: `${entry.recipe.title}\n${link.url}`, url: link.url });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'SIGN_IN_REQUIRED') {
      Alert.alert('Tarifi linkle paylaş', 'Giriş yaparsan tarifini tek linkle gönderirsin; açan kişi tek dokunuşla kendi defterine ekler.', [
        { text: 'Vazgeç', style: 'cancel' },
        ...(entry.source ? [{ text: 'Sadece videoyu gönder', onPress: () => void shareBasic(entry) }] : []),
        { text: 'Giriş yap', onPress: () => openSignIn('share') },
      ]);
      return;
    }
    if (e instanceof ApiError && (e.code === 'ROUTE_NOT_FOUND' || e.status === 404 || e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT')) {
      await shareBasic(entry);
      return;
    }
    throw e;
  }
}
