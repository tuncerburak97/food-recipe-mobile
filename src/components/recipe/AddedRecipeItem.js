import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import Lightbox from "react-native-lightbox-v2";

const w = Dimensions.get("window").width;
const h = Dimensions.get("window").height;

const bytesToMB = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

export default function AddedRecipeItem({
  content,
  imageName,
  imageSize,
  itemOrder,
}) {
  const [lightboxOpacity] = useState(new Animated.Value(1));

  const openLightbox = () => {
    Animated.timing(lightboxOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeLightbox = () => {
    Animated.timing(lightboxOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const renderLightboxContent = () => (
    <Animated.Image
      source={{ uri: `data:image/jpeg;base64,${content}` }}
      style={[styles.lightboxImage, { opacity: lightboxOpacity }]}
      resizeMode="contain"
    />
  );

  return (
    <View style={styles.container}>
      <Lightbox
        swipeToDismiss={true}
        renderContent={renderLightboxContent}
        springConfig={{ tension: 30, friction: 7 }}
        onOpen={openLightbox}
        onClose={closeLightbox}
      >
        <Image
          source={{ uri: `data:image/jpeg;base64,${content}` }}
          style={styles.image}
          resizeMode="cover"
        />
      </Lightbox>

      <View style={styles.textContainer}>
        <Text style={styles.textName}> {imageName}</Text>
        <Text style={styles.textSize}>{bytesToMB(imageSize)}</Text>
        <Text style={styles.textSize}>Yükleme Sırası: {itemOrder}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    margin: 10,
    borderRadius: 20,
  },
  image: {
    width: w * 0.3,
    height: h * 0.15,
    margin: 5,
    borderRadius: 20,
  },
  lightboxImage: {
    width: w * 0.9,
    height: h * 0.5,
    margin: 15,
  },
  textContainer: {
    margin: 10,
  },
  textName: {
    fontSize: 14,
  },
  textSize: {
    fontSize: 12,
    color: "gray",
    marginLeft: 5,
    marginTop: 5,
  },
});
