import React, { useState, useEffect } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AddedRecipeItem from "../components/recipe/AddedRecipeItem";
import { AddRecipe } from "../api/service/service";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Animatable from "react-native-animatable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SwipeableItem from "../components/common/SwipeableItem";
import Header from "../components/common/Header";

const AddRecipeScreen = ({}) => {
  const navigation = useNavigation();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImageRequest = {
    contents: [],
    uploaded_user_device_id: "",
  };

  const clearImages = () => {
    setImages([]);
  };

  const uploadImage = async () => {
    if (images.length === 0) {
      Alert.alert("Hata", "Lütfen en az bir resim yükleyin!");
      return;
    }
    setUploading(true);
    images.forEach((imageData) => {
      uploadImageRequest.contents.push(imageData.content);
    });
    const deviceId = await AsyncStorage.getItem("deviceId");
    uploadImageRequest.uploaded_user_device_id = deviceId;
    try {
      await AddRecipe(uploadImageRequest);
      Alert.alert("Başarılı", "Tarif başarıyla yüklendi!");
      setImages([]);
      navigation.navigate("Ana Sayfa");
    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Tarif yüklenirken bir hata oluştu!");
    } finally {
      setUploading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        if (Platform.OS !== "web") {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            alert("Galeri erişim izni gerekiyor!");
          } else {
            openImagePicker();
          }
        }
      })();
    }, [])
  );

  const openImagePicker = async () => {
    setLoading(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: 10,
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
    setLoading(false);
  };

  const handleDeleteImage = (uri) => {
    const updatedImages = images.filter((image) => image.uri !== uri);
    setImages(
      updatedImages.map((img, index) => ({ ...img, order: index + 1 }))
    );
  };

  const renderUploadedImage = ({ item }) => (
    <Animatable.View animation="fadeIn" duration={500}>
      <SwipeableItem onDelete={() => handleDeleteImage(item.uri)}>
        <AddedRecipeItem
          content={item.content}
          imageName={item.name}
          imageSize={item.size}
          itemOrder={item.order}
          containerStyle={{ marginBottom: 20 }}
        />
      </SwipeableItem>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerStyle}>
        <Header>Yüklenen Fotoğraflar</Header>
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#FF5722"
            style={styles.spinner}
          />
        ) : (
          <View>
            <FlatList
              data={images}
              renderItem={renderUploadedImage}
              keyExtractor={(item, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Seçili fotoğraf yok.</Text>
                </View>
              }
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
            />
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#FF5722" />
                <Text style={styles.uploadingText}>Yükleniyor...</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.iconContainer}>
        <TouchableOpacity style={styles.iconButton} onPress={openImagePicker}>
          <Image
            source={require("../images/addRecipe/gallery.png")}
            style={styles.icon}
          />
          <Text style={styles.iconText}>Galeri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={uploadImage}>
          <Image
            source={require("../images/addRecipe/upload.png")}
            style={styles.icon}
          />
          <Text style={styles.iconText}>Tarifi Yükle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={clearImages}>
          <Image
            source={require("../images/addRecipe/clear.png")}
            style={styles.icon}
          />
          <Text style={styles.iconText}>Temizle</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFF", // Set a consistent background color
  },

  headerStyle: {
    marginBottom: 20,
  },

  iconContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: Platform.OS === "android" ? 30 : 10,
    backgroundColor: "#FFF", // Set a consistent background color
  },
  iconButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10, // Add padding to create space around icons
    marginBottom: 40,
  },
  icon: {
    width: 40,
    height: 40,
    marginBottom: 5,
  },
  iconText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center", // Center the text below the icon
  },
  spinner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#FF5722",
  },
});

export default AddRecipeScreen;
