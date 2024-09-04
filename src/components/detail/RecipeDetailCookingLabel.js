import { View, Text, StyleSheet, Dimensions } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

export default function RecipeDetailCookingLabel({ icon, mainText, subText }) {
  return (
    <View style={styles.cookingLabelContainer}>
      <View>{icon}</View>
      <View>
        <Text style={styles.cookingLabelMainText}>{mainText}</Text>
        <Text style={styles.cookingLabelSubText}>{subText}</Text>
      </View>
    </View>
  );
}
const screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  cookingLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    padding: 5,
    gap: 5,
    width: screenWidth * 0.3,
    borderRadius: 12,
  },
  cookingLabelImage: {
    width: 24,
    height: 24,
  },
  cookingLabelMainText: {
    fontSize: 10,
    fontWeight: "normal",
    color: "#333",
  },
  cookingLabelSubText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FF5722",
  },
});
