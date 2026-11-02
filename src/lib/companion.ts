// The short, warm line under each step in cooking mode: what a friend standing next to you would say.

import type { Step } from '@/lib/types';

interface Context {
  step: Step;
  /** 1-based position of the step. */
  index: number;
  total: number;
  doneCount: number;
  name?: string;
}

/** Picks one line by position, so the same step always says the same thing (no randomness in render). */
function pick(lines: string[], seed: number): string {
  return lines[Math.abs(seed) % lines.length];
}

export function companionLine({ step, index, total, doneCount, name }: Context): string {
  const you = name ? `, ${name}` : '';
  const text = step.text.toLocaleLowerCase('tr');

  if (index === 1) {
    return pick([`Hadi başlayalım${you}. Acele yok, adım adım gideceğiz.`, `İlk adım her zaman en kolayı${you}. Başlayalım.`], total);
  }
  if (index === total) {
    return pick([`Son adım${you}! Mutfağı güzel kokular sardı bile.`, `Neredeyse hazır${you}. Son dokunuş senden.`], total);
  }
  if (step.duration_minutes && step.duration_minutes >= 5) {
    return pick(
      ['Zamanlayıcıyı başlat, ben takip ederim. Bu arada bulaşıklara göz atabilirsin.', 'Süre bende. Telefonu kilitlesen de haber veririm.'],
      index,
    );
  }
  if (step.heat === 'high' || /kızart|yüksek ateş|harlı/.test(text)) {
    return 'Ateş yüksek, ocağın başından ayrılma. Birkaç dakikada renk değişir.';
  }
  if (step.heat === 'low' || /kısık ateş|demlen/.test(text)) {
    return 'Kısık ateşte acele etmeye gerek yok, lezzet zamanla gelir.';
  }
  if (/fırın/.test(text)) {
    return 'Fırını önceden ısıtmak lezzetin yarısı. Kapağı sık açmamaya çalış.';
  }
  if (/doğra|kes|rendele|soy/.test(text)) {
    return pick(['Bıçağı kendinden uzağa tut, hız değil düzen önemli.', 'Parçalar benzer boyda olursa eşit pişer.'], index);
  }
  if (/tuz|baharat|tadına bak|tat/.test(text)) {
    return 'Tadına bakmayı unutma, son kararı damak verir.';
  }
  if (doneCount * 2 >= total && doneCount * 2 - 2 < total) {
    return `Yarıyı geçtik${you}. Çok güzel gidiyorsun.`;
  }
  return pick(
    ['Güzel gidiyorsun. Hazır olunca "Tamamladım"a bas.', 'Bir adım daha. Ben buradayım.', 'Sakin ol, tarif seni bekler.', 'Harika. Bir sonraki adım da en az bu kadar kolay.'],
    index,
  );
}
