import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ImageBackground,
} from "react-native";
import FoodPreviewItem from "../components/recipe/FoodPreviewItem";
import CustomSearchBar from "../components/common/CustomSearchBar";
import { GetChefRecipes } from "../api/service/service";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";

const COLORS = {
  primary: "#FF5722",
  secondary: "#2E7D32",
  text: {
    primary: "#1F2937",
    secondary: "#4B5563",
    light: "#6B7280",
  },
  border: "#E5E7EB",
  background: {
    light: "#F9FAFB",
    white: "#FFFFFF",
  },
};

const ChefRecipesScreen = () => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalRecipes: 0,
    categories: new Set(),
    avgDuration: 0,
  });
  const navigation = useNavigation();
  const route = useRoute();
  const chefName = route.params?.chefName || "Bilinmeyen Şef";

  const fetchRecipes = async () => {
    try {
      const response = await GetChefRecipes(chefName);

      if (response?.data) {
        setRecipes(response.data);
        setFilteredRecipes(response.data);

        const categories = new Set(
          response.data.map((recipe) => recipe.category)
        );
        const totalDuration = response.data.reduce(
          (sum, recipe) => sum + (recipe.duration || 0),
          0
        );
        const avgDuration =
          response.data.length > 0
            ? Math.round(totalDuration / response.data.length)
            : 0;

        setStats({
          totalRecipes: response.data.length,
          categories: categories,
          avgDuration: avgDuration,
        });
      } else {
        console.error("Invalid API response format:", response);
      }
    } catch (error) {
      console.error("Error fetching chef recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        await fetchRecipes();
      };
      fetchData();
    }, [chefName])
  );

  useFocusEffect(
    useCallback(() => {
      const filtered = recipes.filter((recipe) =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecipes(filtered);
    }, [searchQuery, recipes])
  );

  const handleRecipePress = (recipeId) => {
    navigation.navigate("RecipeDetail", { recipeId });
  };

  const renderHeader = () => (
    <>
      <ImageBackground
        source={require("../images/chef-background.jpg")}
        style={styles.headerBackground}
        imageStyle={styles.headerBackgroundImage}
      >
        <View style={styles.headerOverlay}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.metadataContainer}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataValue}>{stats.totalRecipes}</Text>
                <Text style={styles.metadataLabel}>Tarif</Text>
              </View>
              <View style={styles.metadataDivider} />
              <View style={styles.metadataItem}>
                <Text style={styles.metadataValue}>{stats.avgDuration} dk</Text>
                <Text style={styles.metadataLabel}>Ort. Süre</Text>
              </View>
            </View>
          </View>

          <View style={styles.chefInfoContainer}>
            <Text style={styles.chefName}>{chefName}</Text>
          </View>
        </View>
      </ImageBackground>

      <View style={styles.searchContainer}>
        <CustomSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Tarif Ara..."
        />
      </View>
    </>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="food-off"
        size={64}
        color={COLORS.text.light}
      />
      <Text style={styles.emptyTitle}>Tarif Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Aradığınız kriterlere uygun tarif bulunamadı
      </Text>
    </View>
  );

  const renderRecipeItem = ({ item, index }) => (
    <Animatable.View
      animation="fadeInUp"
      delay={index * 100}
      useNativeDriver
      style={styles.recipeItemContainer}
    >
      <FoodPreviewItem
        id={item.id}
        name={item.name}
        category={item.category}
        chef={item.chef}
        duration={item.duration}
        image={item.image}
        onPress={() => handleRecipePress(item.id)}
      />
    </Animatable.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Tarifler Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderRecipeItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.white,
  },
  headerBackground: {
    width: "100%",
    height: 280,
  },
  headerBackgroundImage: {
    opacity: 0.7,
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingTop: 48,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  metadataContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  metadataItem: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  metadataValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 2,
  },
  metadataLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  metadataDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 8,
  },
  chefInfoContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
    backdropFilter: "blur(10px)",
  },
  chefName: {
    fontSize: 26,
    fontWeight: "600",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  searchContainer: {
    backgroundColor: COLORS.background.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  recipeItemContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    backgroundColor: COLORS.background.white,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: "500",
  },
});

export default ChefRecipesScreen;
