import { FlatList, View } from "react-native";

import { React, useState } from "react";
import Header from "../common/Header";
import FoodCategoryGridTile from "../categories/FoodCategoryGridTile";

const CATEGORIES = [
  {
    id: "0",
    title: "Tümü",
    image: require("../../images/all.jpg"),
  },

  {
    id: "1",
    title: "Ana Yemek",
    image: require("../../images/maincourse.jpg"),
  },
  { id: "2", title: "Çorba", image: require("../../images/soup.jpg") },
  { id: "3", title: "Salata", image: require("../../images/salad.jpg") },
  { id: "4", title: "Tatlı", image: require("../../images/desert.jpg") },
  { id: "5", title: "Kahvaltı", image: require("../../images/breakfast.jpg") },
  { id: "6", title: "İçecekler", image: require("../../images/drink.jpg") },
  { id: "7", title: "Atıştırmalık", image: require("../../images/snack.jpg") },
];

export default function FoodCategoryList({ setSelectedCategory }) {
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSelect = (item) => {
    setSelectedItem(item);
  };

  function renderCategory(itemData) {
    function handleCategoryPress(itemData) {
      setSelectedCategory(itemData.title);
      handleSelect(itemData);
    }

    return (
      <FoodCategoryGridTile
        image={itemData.item.image}
        title={itemData.item.title}
        onPress={() => handleCategoryPress(itemData.item)}
        isSelected={itemData.item.id === selectedItem?.id}
      />
    );
  }

  return (
    <View>
      <Header>Kategoriler</Header>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        horizontal
        showsHorizontalScrollIndicator={false}
      ></FlatList>
    </View>
  );
}
