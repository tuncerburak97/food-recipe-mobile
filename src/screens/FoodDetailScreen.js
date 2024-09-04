import React, { useLayoutEffect, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { GetRecipeById } from "../api/service/service";
import RecipeDetailCookingLabel from "../components/detail/RecipeDetailCookingLabel";
import CustomBackButton from "../components/common/CustomBackButton";
import ListItem from "../components/detail/ListItem";

const h = Dimensions.get("window").height;

export default function FoodDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await GetRecipeById(recipeId);
        setRecipe(response.data);
      } catch (error) {
        console.error("Error fetching recipe:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: recipe ? recipe.name : "Tarif Detayı",
    });
  }, [navigation, recipe]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>Tarif bulunamadı.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.backButton}>
        <CustomBackButton size={18} color="black" />
      </View>
      <ImageBackground
        source={{ uri: `data:image/png;base64,${recipe.image}` }}
        style={styles.image}
      />
      <View style={styles.contentContainer}>
        <View style={styles.metadataContainer}>
          <Text style={styles.titleText}>{recipe.name}</Text>
          <View style={styles.labelContainer}>
            <RecipeDetailCookingLabel
              icon={<Ionicons name="time" size={24} color="#FF5722" />}
              mainText="Pişirme Süresi"
              subText={`${recipe.duration} dakika`}
            />
            <RecipeDetailCookingLabel
              icon={
                <MaterialCommunityIcons
                  name="food-takeout-box-outline"
                  size={24}
                  color="#FF5722"
                />
              }
              mainText="Kategori"
              subText={recipe.category}
            />
            <RecipeDetailCookingLabel
              icon={
                <MaterialCommunityIcons
                  name="chef-hat"
                  size={24}
                  color="#FF5722"
                />
              }
              mainText="Şef"
              subText={recipe.chef}
            />
          </View>
        </View>
        <View style={styles.descriptionText}>
          <Text>{recipe.description}</Text>
        </View>
        <ListItem
          data={recipe.materials}
          header="Malzemeler"
          image={
            <Image
              source={require("../images/ingredient.png")}
              style={{ width: 18, height: 18, tintColor: "#FF5722" }}
            />
          }
          initiallyExpanded={true} // Varsayılan olarak açık
          noNumbers // Numara göstermemek için
        />
        <ListItem
          data={recipe.recipes}
          header="Yapılışı"
          image={
            <Image
              source={require("../images/instruction.png")}
              style={{ width: 18, height: 18, tintColor: "green" }}
            />
          }
          initiallyExpanded={true} // Varsayılan olarak açık
        />
        {recipe.current_user_uploaded && (
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              navigation.navigate("EditRecipe", { recipeId: recipe.id })
            }
          >
            <Text style={styles.buttonText}>Tarifi Güncelle</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 10,
    zIndex: 1,
  },
  image: {
    height: h * 0.35,
  },
  contentContainer: {
    marginTop: -25,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  metadataContainer: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    alignItems: "center",
  },
  categoryText: {
    marginTop: 10,
    fontSize: 15,
    color: "#000",
  },
  titleText: {
    fontSize: 17.5,
    fontWeight: "bold",
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 12,
    marginTop: 5,
    padding: 10,
  },
  labelContainer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    marginLeft: 20,
  },
  ingredientContainer: {
    marginTop: 10,
    padding: 5,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "red",
  },
  button: {
    backgroundColor: "#FF5722",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});
