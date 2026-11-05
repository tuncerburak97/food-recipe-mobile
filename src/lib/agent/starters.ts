/**
 * Ready-made questions for the assistant (Home's card and the empty chat), picked for the time of
 * day and for what the user has. Plain rules: no model call.
 */
export function assistantStarters({ pantryCount, hour = new Date().getHours() }: { pantryCount: number; hour?: number }): string[] {
  const meal =
    hour >= 5 && hour < 11
      ? 'Kahvaltılık bir şey öner'
      : hour >= 11 && hour < 16
        ? 'Öğle için pratik bir yemek öner'
        : hour >= 16 && hour < 23
          ? 'Akşama tavuk yemeği öner'
          : 'Gece için hafif bir atıştırmalık öner';
  return [
    pantryCount > 0 ? 'Dolabımla ne pişirebilirim?' : 'Elimde pirinç ve soğan var, ne yapabilirim?',
    meal,
    'İçinde bulgur olan yemekleri getir',
    'Sütlü tatlıları getir',
    '3 günlük akşam menüsü hazırla',
    '20 dakikada hazır yemekler',
  ];
}

/** Example lines that turn in Home's ask box, to show what can be asked. */
export const ASK_EXAMPLES = [
  'İçinde bulgur olan yemekler…',
  'Sütlü tatlıları getir…',
  'Dolabıma yumurta ekle…',
  'Bu haftaya menü hazırla…',
  'Mercimek çorbası tarifi var mı?',
  'Eksikleri alışveriş listeme ekle…',
];
