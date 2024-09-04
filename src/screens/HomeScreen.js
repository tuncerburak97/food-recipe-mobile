import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import FoodCategoryList from "../components/categories/FoodCategoryList";
import CustomSearchBar from "../components/common/CustomSearchBar";
import FoodPreviewItem from "../components/recipe/FoodPreviewItem";
import { GetRecipes, DeleteRecipe } from "../api/service/service";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomTabBar from "../components/common/CustomTabBar";
import SwipeableItem from "../components/common/SwipeableItem";
import Header from "../components/common/Header";
import { Alert } from "react-native";
import CustomAlert from "../components/common/CustomAlert";

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("allRecipes");
  const [alert, setAlert] = useState({ visible: false, type: "", message: "" });

  const fetchRecipes = async () => {
    try {
      const response = await GetRecipes();
      setRecipes(response.data);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRecipes();
    }, [])
  );

  function clearSearch() {
    setSearchQuery("");
  }

  function handleCategorySelect(category) {
    if (category === "Tümü") {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory(category);
  }

  const handleDeleteRecipe = async (id) => {
    try {
      setLoading(true);
      await DeleteRecipe(id);
      const updatedRecipes = recipes.filter((recipe) => recipe.id !== id);
      setRecipes(updatedRecipes);
      setAlert({
        visible: true,
        type: "success",
        message: "Tarif başarıyla silindi!",
      });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      setAlert({
        visible: true,
        type: "error",
        message: "Tarif silinirken bir hata oluştu!",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearchQuery = recipe.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || recipe.category === selectedCategory;
    const matchesTab =
      selectedTab === "allRecipes" || recipe.current_user_uploaded;

    return matchesSearchQuery && matchesCategory && matchesTab;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <CustomSearchBar
          placeholder="Yemek ara..."
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          clearSearch={clearSearch}
        />
        <FoodCategoryList setSelectedCategory={handleCategorySelect} />

        <Header>Tarifler</Header>
        <CustomTabBar
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />
        {loading ? (
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color="#FF5722" />
          </View>
        ) : (
          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>
              selectedTab === "myRecipes" ? (
                <SwipeableItem onDelete={() => handleDeleteRecipe(item.id)}>
                  <View>
                    <FoodPreviewItem
                      id={item.id}
                      name={item.name}
                      category={item.category}
                      chef={item.chef}
                      labels={item.labels}
                      duration={item.duration}
                      image={item.image}
                    />
                  </View>
                </SwipeableItem>
              ) : (
                <View>
                  <FoodPreviewItem
                    id={item.id}
                    name={item.name}
                    category={item.category}
                    chef={item.chef}
                    labels={item.labels}
                    duration={item.duration}
                    image={item.image}
                  />
                </View>
              )
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Tarif bulunamadı.</Text>
              </View>
            )}
            contentContainerStyle={styles.flatListContent}
          />
        )}
      </View>
      {alert.visible && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ visible: false, type: "", message: "" })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 150,
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
  },
  flatListContent: {
    paddingBottom: Platform.OS === "android" ? 90 : 30,
  },
});
