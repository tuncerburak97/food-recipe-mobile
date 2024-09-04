import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import FoodPreviewItem from "../components/recipe/FoodPreviewItem";
import CustomSearchBar from "../components/common/CustomSearchBar";
import CustomBackButton from "../components/common/CustomBackButton";
import { GetChefRecipes } from "../api/service/service";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";

const ChefRecipesScreen = () => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation();
  const route = useRoute();
  const { chefName } = route.params;

  const fetchRecipes = async () => {
    try {
      const response = await GetChefRecipes(chefName);
      setRecipes(response.data);
      setFilteredRecipes(response.data);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CustomBackButton />
        <View style={styles.searchBarContainer}>
          <CustomSearchBar
            placeholder="Tarif ara..."
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            clearSearch={() => setSearchQuery("")}
          />
        </View>
      </View>
      {loading ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleRecipePress(item.id)}>
              <FoodPreviewItem
                id={item.id}
                name={item.name}
                category={item.category}
                chef={item.chef}
                labels={item.labels}
                duration={item.duration}
                image={item.image}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Yemek bulunamadı.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  searchBarContainer: {
    flex: 1,
    marginLeft: 10,
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
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
  },
});

export default ChefRecipesScreen;
