import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import FoodCategoryList from "../components/categories/FoodCategoryList";
import EnhancedSearchBar from "../components/common/EnhancedSearchBar";
import FoodPreviewItem from "../components/recipe/FoodPreviewItem";
import { GetRecipes, DeleteRecipe } from "../api/service/service";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomTabBar from "../components/common/CustomTabBar";
import SwipeableItem from "../components/common/SwipeableItem";
import EnhancedHeader from "../components/common/EnhancedHeader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomAlert from "../components/common/CustomAlert";
import * as Animatable from "react-native-animatable";

const { width } = Dimensions.get("window");

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

  const renderItem = useCallback(
    ({ item }) => {
      return selectedTab === "myRecipes" ? (
        <SwipeableItem onDelete={() => handleDeleteRecipe(item.id)}>
          <FoodPreviewItem
            id={item.id}
            name={item.name}
            category={item.category}
            chef={item.chef}
            labels={item.labels}
            duration={item.duration}
            image={item.image}
          />
        </SwipeableItem>
      ) : (
        <FoodPreviewItem
          id={item.id}
          name={item.name}
          category={item.category}
          chef={item.chef}
          labels={item.labels}
          duration={item.duration}
          image={item.image}
        />
      );
    },
    [selectedTab]
  );

  const renderEmptyState = () => (
    <Animatable.View animation="fadeIn" style={styles.emptyContainer}>
      <MaterialCommunityIcons name="food-off" size={80} color="#DDD" />
      <Text style={styles.emptyTitle}>Tarif Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Aradığınız kriterlere uygun tarif bulunamadı.
      </Text>
    </Animatable.View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF5722" />
      <Text style={styles.loadingText}>Tarifler Yükleniyor...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <EnhancedHeader />

      <View style={styles.content}>
        <EnhancedSearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          clearSearch={clearSearch}
        />

        <Animatable.View animation="fadeIn" duration={800} delay={400}>
          <FoodCategoryList setSelectedCategory={handleCategorySelect} />
        </Animatable.View>

        <View style={styles.tabSection}>
          <CustomTabBar
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
          />
        </View>

        {loading ? (
          renderLoadingState()
        ) : (
          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            initialNumToRender={6}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
  content: {
    flex: 1,
  },
  tabSection: {
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
});
