import React, { useState } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";

export default function FoodCategoryGridTile({
  image,
  title,
  onPress,
  isSelected,
}) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.itemContainer}>
        <View style={[styles.circle, isSelected ? styles.selected : null]}>
          <Image source={image} style={styles.image} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 8,
  },
  itemContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden", // Add this line
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  selected: {
    borderColor: "#FF5722",
    borderWidth: 2,
  },
  textContainer: {
    marginTop: 5,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
