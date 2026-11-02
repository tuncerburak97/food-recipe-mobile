import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PickedPhoto } from '@/lib/journal';

/**
 * Small, light photos: the picker compresses to JPEG (iOS hands over JPEG instead of HEIC), which
 * keeps a phone photo around 0.5-1.5 MB for the upload.
 */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.5,
  exif: false,
  allowsEditing: false,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

function toPicked(res: ImagePicker.ImagePickerResult): PickedPhoto | null {
  const a = res.canceled ? undefined : res.assets?.[0];
  if (!a) return null;
  const type = a.mimeType ?? 'image/jpeg';
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type.includes('hei') ? 'heic' : 'jpg';
  return { uri: a.uri, type, name: a.fileName || `yemek.${ext}` };
}

async function fromCamera(): Promise<PickedPhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) {
      Alert.alert('Kamera izni kapalı', 'Fotoğraf çekmek için Ayarlar’dan kameraya izin verebilirsin.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Ayarlar', onPress: () => void Linking.openSettings() },
      ]);
    }
    return null;
  }
  return toPicked(await ImagePicker.launchCameraAsync(OPTIONS));
}

async function fromLibrary(): Promise<PickedPhoto | null> {
  return toPicked(await ImagePicker.launchImageLibraryAsync(OPTIONS));
}

/** Asks "camera or library" in one system sheet, then opens it. The web opens the file picker. */
export function pickPhoto(onPicked: (photo: PickedPhoto) => void) {
  const run = (open: () => Promise<PickedPhoto | null>) =>
    open()
      .then((p) => p && onPicked(p))
      .catch(() => Alert.alert('Fotoğraf açılamadı', 'Tekrar dener misin?'));
  if (Platform.OS === 'web') {
    void run(fromLibrary);
  } else if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({ options: ['Fotoğraf çek', 'Galeriden seç', 'Vazgeç'], cancelButtonIndex: 2 }, (i) => {
      if (i === 0) void run(fromCamera);
      if (i === 1) void run(fromLibrary);
    });
  } else {
    // Android shows three buttons as neutral (left), negative, positive.
    Alert.alert(
      'Fotoğraf ekle',
      undefined,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Galeriden seç', onPress: () => void run(fromLibrary) },
        { text: 'Fotoğraf çek', onPress: () => void run(fromCamera) },
      ],
      { cancelable: true },
    );
  }
}

/**
 * A square tile for the photo of what was cooked: "Fotoğraf" with a camera glyph when empty, the
 * photo with a remove mark once picked. Tapping always (re)picks.
 */
export function PhotoTile({
  photo,
  onChange,
  size = 96,
  disabled,
}: {
  photo?: PickedPhoto;
  onChange: (photo?: PickedPhoto) => void;
  size?: number;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <Pressable
        onPress={() => pickPhoto(onChange)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={photo ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
        accessibilityHint="Kamerayla çek ya da galeriden seç"
        style={({ pressed }) => [
          styles.tile,
          { backgroundColor: colors.surfaceMuted, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        ]}>
        {photo ? (
          <Image source={photo.uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <>
            <Icon name="camera-outline" size={24} color={colors.text} />
            <Text variant="footnote" weight="600" color="textSecondary">
              Fotoğraf
            </Text>
          </>
        )}
      </Pressable>
      {photo && !disabled ? (
        <Pressable
          onPress={() => onChange(undefined)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fotoğrafı kaldır"
          style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.7 : 1 }]}>
          <Icon name="close" size={16} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 6 },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,20,33,0.62)',
  },
});
