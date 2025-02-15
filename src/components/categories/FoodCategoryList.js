import React, { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import FoodCategoryGridTile from "./FoodCategoryGridTile";
import Colors from "../../constants/Colors";
import * as Animatable from "react-native-animatable";

const categories = [
  { id: "all", name: "Tümü", icon: "silverware-fork-knife" },
  { id: "main", name: "Ana Yemek", icon: "food-turkey" },
  { id: "soup", name: "Çorba", icon: "bowl-mix" },
  { id: "dessert", name: "Tatlı", icon: "cake-variant" },
  { id: "salad", name: "Salata", icon: "food-apple" },
  { id: "breakfast", name: "Kahvaltı", icon: "coffee" },
  { id: "snack", name: "Atıştırmalık", icon: "cookie" },
];

const FoodCategoryList = ({ setSelectedCategory }) => {
  const [selectedId, setSelectedId] = useState("all");

  const handleCategoryPress = (category) => {
    setSelectedId(category.id);
    setSelectedCategory(category.name);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="normal"
      >
        {categories.map((category, index) => (
          <Animatable.View
            key={category.id}
            animation="fadeIn"
            delay={index * 100}
            duration={500}
          >
            <FoodCategoryGridTile
              title={category.name}
              icon={category.icon}
              onSelect={() => handleCategoryPress(category)}
              isSelected={selectedId === category.id}
            />
          </Animatable.View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    paddingVertical: 15,
  },
  scrollContent: {
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
});

export default FoodCategoryList;
