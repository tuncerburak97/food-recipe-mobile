import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";

export default function FoodPreviewItem({
  id,
  name,
  category,
  chef,
  labels,
  duration,
  image,
}) {
  const navigation = useNavigation();
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const preloadImage = async () => {
      try {
        await ExpoImage.prefetch(image);
        setImageLoaded(true);
      } catch (error) {
        console.error("Görsel önceden yüklenirken hata:", error);
      }
    };

    preloadImage();
  }, [image]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => navigation.navigate("RecipeDetail", { recipeId: id })}
        android_ripple={{ color: "#ccc" }}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <View style={styles.gridItem}>
          <ExpoImage
            source={{ uri: image }}
            style={styles.image}
            onLoad={() => setImageLoaded(true)}
          />
          <View style={styles.mealDetails}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{name}</Text>
            </View>
            <View style={styles.subDetails}>
              <View style={styles.chefContainer}>
                <Image
                  source={require("../../images/cooking.png")}
                  style={styles.chefImage}
                />
                <Text style={styles.labels}>{chef}</Text>
              </View>
              <View style={styles.labelContainer}>
                <Image
                  source={require("../../images/tag.png")}
                  style={styles.labelImage}
                />
                <Text style={styles.labels} numberOfLines={3}>
                  {labels.join(", ")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 15,
    backgroundColor: "white",
    overflow: "hidden",
    borderRadius: 10,
    padding: 10,
    elevation: 5,
    shadowColor: "black",
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
  },
  buttonPressed: {
    opacity: 0.5,
  },
  gridItem: {
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: "30%",
    height: "100%",
    borderRadius: 10,
  },
  mealDetails: {
    paddingLeft: 15,
    width: "70%",
  },
  titleContainer: { marginTop: 0 },
  title: {
    fontSize: 16,
  },
  subDetails: {
    marginTop: 10,
  },
  labels: {
    color: "#888",
  },
  chefContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  chefImage: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  labelContainer: {
    flexDirection: "row",
  },
  labelImage: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
});
