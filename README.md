# Yemek Tarifi Rehberi — mobil

Expo SDK 58 + Expo Router + React Native 0.88 (TypeScript). Instagram Reels linkinden AI ile tarif oluşturur;
`../recipe-backend` (Go) ile konuşur.

## Çalıştırma

```bash
# 1) backend (../recipe-backend)
docker compose up -d --build        # .env: IG_PROVIDER=mock, RECIPE_AGENT=mock
make seed                           # örnek kullanıcı + tarifler

# 2) mobil
npm install
npm run ios                         # Expo Go ile iOS simülatörde açar
```

Backend adresi otomatik olarak Metro'nun çalıştığı makinenin `:8080` portudur. Değiştirmek için `.env.example`'a bak.

## Akış

| Ekran | Dosya | Ne yapar |
|---|---|---|
| Ana ekran | `src/app/index.tsx` | Keşfet / Tariflerim, arama, kategori, öne çıkanlar |
| Tarif detayı | `src/app/recipe/[id].tsx` | Malzemeler (işaretlenebilir), adımlar, kaynak Reels |
| Yemek Asistanı | `src/app/assistant/[id].tsx` | Tarif hakkında sohbet; değişiklik önerisini "Tarifime uygula" ile kişisel sürüm olarak kaydeder |
| Pişirme modu | `src/app/cook/[id].tsx` | Hazırlık listesi, sonra her adım tek sayfada; ekran kapanmaz |
| Reels'ten ekle | `src/app/add.tsx` | 1) link → 2) `POST /api/v1/reels/fetch` → 3) `POST /api/v1/reels/fetch-recipe` → kaydet |

`add` ekranı `yemektarifi://add?url=<reels linki>` ile de açılır.

## Instagram'dan paylaşım

Instagram'da Reels → Paylaş → (paylaşım menüsü) → **Yemek Tarifi Rehberi** seçilince uygulama açılır ve Reels hemen getirilir.

- iOS paylaşım uzantısı ve Android intent filter'ı `expo-sharing` config plugin'i üretir (`app.json`); uzantının menüdeki adı `plugins/with-share-extension-name.js` ile uygulama adına çevrilir.
- Uzantı uygulamayı `yemektarifi://expo-sharing` ile açar; `src/app/+native-intent.ts` paylaşılan metin/URL'den Instagram linkini bulup `/add?url=...`'e yönlendirir.
- Expo Go'da çalışmaz, geliştirme build'i gerekir. SDK 58 **Xcode 26.4+** istediği için yerelde `npx expo run:ios`, ya da bulutta:

```bash
npx eas-cli build --profile development --platform ios   # simülatör için .app
npm start                                                # dev client ile Metro (Expo Go için: npm run go)
```

- App Store build'inde EAS uzantı için ayrı bir bundle ID (`com.tuncer.food-recipe-ai-mobile.expo-sharing-extension`) ve App Group'u (`group.com.tuncer.food-recipe-ai-mobile`) Apple hesabında otomatik oluşturur.

## Kullanıcı ve veri

- İlk açılışta isim sorulur (`src/app/welcome.tsx`), backend'de misafir hesap açılır (`POST /api/v1/users`), token Keychain'de saklanır (`expo-secure-store`) ve her istekte `Authorization: Bearer` olarak gider.
- Feed, arama ve kategori filtresi backend'den gelir (`GET /api/v1/recipes`); kaydetme `POST /api/v1/me/recipes`. Veri katmanı: `src/lib/queries.ts` (TanStack Query).
- Örnek tarifler için backend'de `make seed`; Baseten anahtarı yoksa backend'i `RECIPE_AGENT=mock` ile çalıştır.

## Native build / App Store

`ios/` ve `android/` klasörleri `app.json`'dan üretilir (`npx expo prebuild`), elle düzenlenmez.
Bundle ID (`com.tuncer.food-recipe-ai-mobile`), EAS proje ID'si ve App Store ayarları (`eas.json`) eski uygulamayla aynıdır.
Mağazaya yeni sürüm göndermeden önce `app.json`'daki `version` / `ios.buildNumber` artırılmalı.
