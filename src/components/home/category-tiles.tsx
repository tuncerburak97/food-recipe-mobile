import { router } from 'expo-router';

import { Chip, ChipWrap } from '@/components/ui/chip';
import { categoryLabel } from '@/constants/categories';
import type { CategoryCount } from '@/lib/types';

/** Categories that have recipes, as text chips with counts; a tap opens Search filtered to it. */
export function CategoryTiles({ counts }: { counts: CategoryCount[] }) {
  return (
    <ChipWrap>
      {counts.map(({ category, count }) => (
        <Chip
          key={category}
          tone="sunken"
          kind="button"
          label={categoryLabel(category)}
          count={count}
          onPress={() => router.navigate({ pathname: '/search', params: { category } })}
        />
      ))}
    </ChipWrap>
  );
}
