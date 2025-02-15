import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AddRecipe } from "../api/service/service";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Animatable from "react-native-animatable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MaterialIcons,
  Ionicons,
  AntDesign,
  Feather,
} from "@expo/vector-icons";
import GalleryPermissionModal from "../components/recipe/GalleryPermissionModal";
import CustomLoadingModal from "../components/common/CustomLoadingModal";
import * as MediaLibrary from "expo-media-library";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useToast } from "../components/common/ToastManager";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const SPACING = 10;
const ITEM_WIDTH = (width - (COLUMN_COUNT + 1) * SPACING) / COLUMN_COUNT;
const MAX_IMAGES = 5;

// Renk paleti
const COLORS = {
  primary: "#FF5722",
  secondary: "#4A90E2",
  accent: "#2ECC71",
  text: "#333333",
  textLight: "#666666",
  background: "#FFFFFF",
  border: "#F0F0F0",
  orderBadge: "#4A90E2",
  deleteButton: "#E74C3C",
};

const ImageItem = React.memo(
  ({
    item,
    index,
    onPress,
    onLongPress,
    onDelete,
    isBeingDragged,
    translateX,
    translateY,
    scale,
    isDragging,
    onDragEnd,
  }) => {
    const rStyle = useAnimatedStyle(() => {
      if (!isBeingDragged) return {};

      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { scale: scale.value },
        ],
        zIndex: isDragging.value ? 1000 : 1,
      };
    });

    const itemPanGesture = Gesture.Pan()
      .onStart(() => {
        scale.value = withSpring(1.1);
        isDragging.value = true;
      })
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      })
      .onEnd(() => {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        isDragging.value = false;
        runOnJS(onDragEnd)();
      });

    return (
      <GestureDetector gesture={itemPanGesture}>
        <Animated.View style={[styles.imageContainer, rStyle]}>
          <TouchableOpacity
            onPress={() => onPress(item)}
            onLongPress={() => onLongPress(index)}
            delayLongPress={200}
          >
            <Image source={{ uri: item.uri }} style={styles.image} />
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>{item.order}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(item.uri)}
            >
              <MaterialIcons
                name="delete-outline"
                size={24}
                color={COLORS.deleteButton}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    );
  }
);

const AddRecipeScreen = () => {
  const navigation = useNavigation();
  const showToast = useToast();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasGalleryPermission, setHasGalleryPermission] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [selectedImage, setSelectedImage] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const checkGalleryPermission = async () => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status === "granted") {
      setHasGalleryPermission(true);
      if (images.length === 0) {
        openImagePicker(); // Otomatik galeri açılışı
      }
    } else {
      setIsModalVisible(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkGalleryPermission();
    }, [])
  );

  const openImagePicker = async () => {
    if (hasGalleryPermission) {
      if (images.length >= MAX_IMAGES) {
        Alert.alert("Uyarı", "En fazla 5 fotoğraf yükleyebilirsiniz.");
        return;
      }
      setLoading(true);
      try {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1,
          base64: true,
          allowsMultipleSelection: true,
          selectionLimit: MAX_IMAGES - images.length,
          selectedAssets: images.map((image) => ({ uri: image.uri })),
        });

        if (!result.canceled) {
          let newImages = [...images];
          let orderItem = images.length;
          result.assets.forEach((item) => {
            if (!newImages.find((img) => img.uri === item.uri)) {
              orderItem++;
              const uploadedImage = {
                name: item.fileName,
                size: item.fileSize,
                content: item.base64,
                order: orderItem,
                uri: item.uri,
              };
              newImages.push(uploadedImage);
            }
          });
          setImages(newImages);
        }
      } catch (error) {
        Alert.alert("Hata", "Fotoğraf seçimi sırasında bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    } else {
      await checkGalleryPermission();
    }
  };

  const handleDeleteImage = (uri) => {
    Alert.alert(
      "Fotoğrafı Sil",
      "Bu fotoğrafı silmek istediğinizden emin misiniz?",
      [
        {
          text: "İptal",
          style: "cancel",
        },
        {
          text: "Sil",
          onPress: () => {
            const updatedImages = images.filter((image) => image.uri !== uri);
            setImages(
              updatedImages.map((img, index) => ({ ...img, order: index + 1 }))
            );
          },
          style: "destructive",
        },
      ]
    );
  };

  const uploadImage = async () => {
    if (images.length === 0) {
      showToast({
        message: "Lütfen en az bir fotoğraf seçin",
        type: "warning",
        duration: 3000,
      });
      return;
    }
    setUploading(true);
    try {
      // Create a new request object for each upload
      const uploadImageRequest = {
        contents: [],
        uploaded_user_device_id: await AsyncStorage.getItem("deviceId"),
      };

      // Add image contents
      images.forEach((imageData) => {
        uploadImageRequest.contents.push(imageData.content);
      });

      const response = await AddRecipe(uploadImageRequest);

      // Clear images and show success message
      setImages([]);
      showToast({
        message: "Tarifiniz başarıyla yüklendi!",
        type: "success",
        duration: 3000,
      });
      navigation.goBack();
    } catch (error) {
      console.error("Upload error:", error);
      showToast({
        message: "Tarif yüklenirken bir hata oluştu",
        type: "error",
        duration: 3000,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImagePress = (image) => {
    setSelectedImage(image);
  };

  const handleDragEnd = () => {
    if (draggingIndex !== null) {
      // Yeni pozisyonu hesapla
      const newIndex = Math.max(
        0,
        Math.min(Math.round(translateY.value / ITEM_WIDTH), images.length - 1)
      );

      if (newIndex !== draggingIndex) {
        const newImages = [...images];
        const [movedItem] = newImages.splice(draggingIndex, 1);
        newImages.splice(newIndex, 0, movedItem);

        // Sıra numaralarını güncelle
        const reorderedImages = newImages.map((img, index) => ({
          ...img,
          order: index + 1,
        }));

        setImages(reorderedImages);
      }
      setDraggingIndex(null);
    }
  };

  const clearAllImages = () => {
    Alert.alert(
      "Tüm Fotoğrafları Temizle",
      "Tüm seçili fotoğrafları silmek istediğinizden emin misiniz?",
      [
        {
          text: "İptal",
          style: "cancel",
        },
        {
          text: "Temizle",
          onPress: () => setImages([]),
          style: "destructive",
        },
      ]
    );
  };

  const renderImageItem = ({ item, index }) => (
    <ImageItem
      item={item}
      index={index}
      onPress={handleImagePress}
      onLongPress={setDraggingIndex}
      onDelete={handleDeleteImage}
      isBeingDragged={index === draggingIndex}
      translateX={translateX}
      translateY={translateY}
      scale={scale}
      isDragging={isDragging}
      onDragEnd={handleDragEnd}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>Henüz Fotoğraf Seçilmedi</Text>
      <Text style={styles.emptySubtitle}>
        Tarif fotoğraflarınızı yüklemek için galeriye erişin
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={openImagePicker}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>Fotoğraf Seç</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Tarif Yükle</Text>
          <View style={styles.headerActions}>
            {images.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearAllImages}
              >
                <MaterialIcons
                  name="cleaning-services"
                  size={22}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            )}
            <View style={styles.headerIconContainer}>
              <AntDesign name="camerao" size={24} color={COLORS.primary} />
            </View>
          </View>
        </View>
        {images.length > 0 && (
          <View style={styles.headerInfo}>
            <Feather
              name="info"
              size={16}
              color={COLORS.textLight}
              style={styles.infoIcon}
            />
            <Text style={styles.headerSubtitle}>
              Seçilen Fotoğraflar: {images.length}/{MAX_IMAGES}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fotoğraflar Yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={images}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => `image-${index}`}
            numColumns={COLUMN_COUNT}
            contentContainerStyle={styles.gridContainer}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {images.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton]}
            onPress={openImagePicker}
            disabled={loading || uploading}
          >
            <Ionicons name="images" size={24} color="#FF5722" />
            <Text style={styles.actionButtonText}>Galeri</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={uploadImage}
            disabled={loading || uploading}
          >
            <MaterialIcons name="cloud-upload" size={24} color="#FFF" />
            <Text style={[styles.actionButtonText, styles.uploadButtonText]}>
              Tarifi Yükle
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {uploading && (
        <CustomLoadingModal
          visible={uploading}
          message="Tarifiniz yükleniyor... Lütfen bekleyin"
          icon="food-turkey"
        />
      )}

      <GalleryPermissionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />

      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.previewModal}>
          <View style={styles.previewContent}>
            <Image
              source={{ uri: selectedImage?.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closePreviewButton}
              onPress={() => setSelectedImage(null)}
            >
              <AntDesign name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.previewInfo}>
              <Text style={styles.previewText}>
                Fotoğraf {selectedImage?.order} / {images.length}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    backgroundColor: COLORS.background,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: Platform.OS === "ios" ? "800" : "bold",
    color: COLORS.text,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    letterSpacing: -0.5,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 87, 34, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#F8F8F8",
    padding: 10,
    borderRadius: 10,
  },
  infoIcon: {
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  gridContainer: {
    padding: SPACING,
    paddingBottom: Platform.OS === "ios" ? 140 : 120,
  },
  imageContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    margin: SPACING / 2,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.orderBadge,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  orderText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 90 : 80,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    zIndex: 1000,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  galleryButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FF5722",
  },
  uploadButton: {
    backgroundColor: "#FF5722",
    flex: 2,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#FF5722",
  },
  uploadButtonText: {
    color: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  previewModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
  },
  previewContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "90%",
    height: "70%",
    borderRadius: 12,
  },
  closePreviewButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  previewInfo: {
    position: "absolute",
    bottom: 40,
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
  previewText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AddRecipeScreen;
