import React, { useLayoutEffect, useState, useCallback } from "react";
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
  Share,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { GetRecipeById } from "../api/service/service";
import RecipeDetailCookingLabel from "../components/detail/RecipeDetailCookingLabel";
import CustomBackButton from "../components/common/CustomBackButton";
import ListItem from "../components/detail/ListItem";
import { Image as ExpoImage } from "expo-image";
import ImageView from "react-native-image-viewing";
import * as Animatable from "react-native-animatable";

const h = Dimensions.get("window").height;
const w = Dimensions.get("window").width;

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

export default function FoodDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [servingSize, setServingSize] = useState(1);
  const [expandedSections, setExpandedSections] = useState({
    ingredients: true,
    instructions: true,
  });

  const fetchRecipe = useCallback(async () => {
    setLoading(true);
    try {
      const response = await GetRecipeById(recipeId);
      setRecipe(response.data);

      if (response.data.image) {
        await ExpoImage.prefetch(response.data.image);
        setImageLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching recipe:", error);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useFocusEffect(
    useCallback(() => {
      fetchRecipe();
      return () => {
        // Cleanup
        setRecipe(null);
        setLoading(true);
        setImageLoaded(false);
        setServingSize(1);
      };
    }, [fetchRecipe])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: recipe ? recipe.name : "Tarif Detayı",
    });
  }, [navigation, recipe]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${recipe.name} tarifini kontrol et!\n\n${
          recipe.description
        }\n\nMalzemeler:\n${recipe.materials.join(
          "\n"
        )}\n\nYapılışı:\n${recipe.recipes.join("\n")}`,
        title: recipe.name,
      });
    } catch (error) {
      console.error("Error sharing recipe:", error);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite functionality with backend
  };

  const adjustServingSize = (increment) => {
    const newSize = servingSize + increment;
    if (newSize >= 1 && newSize <= 10) {
      setServingSize(newSize);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Animatable.Text animation="fadeIn" style={styles.loadingText}>
          Tarif Yükleniyor...
        </Animatable.Text>
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
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.headerContainer}>
          <ExpoImage
            source={{ uri: recipe.image }}
            style={styles.headerImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.headerOverlay} />

          <View style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={28} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={toggleFavorite}
                >
                  <AntDesign
                    name={isFavorite ? "heart" : "hearto"}
                    size={24}
                    color={isFavorite ? "#FF5722" : "#FFF"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleShare}
                >
                  <Ionicons name="share-outline" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <Animatable.View
              animation="fadeIn"
              delay={300}
              style={styles.headerInfo}
            >
              <Text style={styles.recipeCategory}>{recipe.category}</Text>
              <Text style={styles.recipeTitle}>{recipe.name}</Text>

              <View style={styles.recipeMetaInfo}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="chef-hat"
                    size={22}
                    color="#FFF"
                  />
                  <Text style={styles.metaText}>{recipe.chef}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={22} color="#FFF" />
                  <Text style={styles.metaText}>{recipe.duration} dakika</Text>
                </View>
              </View>
            </Animatable.View>
          </View>
        </View>

        <Animatable.View
          animation="fadeInUp"
          delay={400}
          style={styles.contentContainer}
        >
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Tarif Hakkında</Text>
            <Text style={styles.descriptionText}>{recipe.description}</Text>
          </View>

          <View style={[styles.sectionContainer, styles.cardContainer]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection("ingredients")}
            >
              <View style={styles.sectionTitleContainer}>
                <Image
                  source={require("../images/ingredient.png")}
                  style={[styles.sectionIcon, { tintColor: COLORS.primary }]}
                />
                <Text style={styles.sectionTitle}>Malzemeler</Text>
              </View>
              <Ionicons
                name={
                  expandedSections.ingredients ? "chevron-up" : "chevron-down"
                }
                size={24}
                color={COLORS.text.light}
              />
            </TouchableOpacity>

            {expandedSections.ingredients && (
              <Animatable.View
                animation="fadeIn"
                duration={300}
                style={styles.sectionContent}
              >
                <View style={styles.ingredientsList}>
                  {recipe.materials.map((material, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View
                        style={[
                          styles.bulletPoint,
                          { backgroundColor: COLORS.primary },
                        ]}
                      />
                      <Text style={styles.ingredientText}>{material}</Text>
                    </View>
                  ))}
                </View>
              </Animatable.View>
            )}
          </View>

          <View style={[styles.sectionContainer, styles.cardContainer]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection("instructions")}
            >
              <View style={styles.sectionTitleContainer}>
                <Image
                  source={require("../images/instruction.png")}
                  style={[styles.sectionIcon, { tintColor: COLORS.secondary }]}
                />
                <Text style={styles.sectionTitle}>Hazırlanışı</Text>
              </View>
              <Ionicons
                name={
                  expandedSections.instructions ? "chevron-up" : "chevron-down"
                }
                size={24}
                color={COLORS.text.light}
              />
            </TouchableOpacity>

            {expandedSections.instructions && (
              <Animatable.View
                animation="fadeIn"
                duration={300}
                style={styles.sectionContent}
              >
                <View style={styles.stepsList}>
                  {recipe.recipes.map((step, index) => (
                    <Animatable.View
                      key={index}
                      animation="fadeInRight"
                      delay={index * 100}
                      style={styles.stepItem}
                    >
                      <View
                        style={[
                          styles.stepNumber,
                          { backgroundColor: COLORS.secondary },
                        ]}
                      >
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </Animatable.View>
                  ))}
                </View>
              </Animatable.View>
            )}
          </View>

          {recipe.current_user_uploaded && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: COLORS.primary }]}
              onPress={() =>
                navigation.navigate("EditRecipe", { recipeId: recipe.id })
              }
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={20}
                color="#FFF"
              />
              <Text style={styles.editButtonText}>Tarifi Düzenle</Text>
            </TouchableOpacity>
          )}
        </Animatable.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContainer: {
    height: h * 0.45,
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  headerContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
  },
  headerActions: {
    flexDirection: "row",
    gap: 15,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  recipeCategory: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "rgba(255,87,34,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
    overflow: "hidden",
  },
  recipeTitle: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  recipeMetaInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    paddingHorizontal: 5,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 25,
  },
  metaText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  contentContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 25,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.background.light,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: {
    width: 24,
    height: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text.primary,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666",
  },
  cardContainer: {
    backgroundColor: COLORS.background.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  sectionContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingredientText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    flex: 1,
  },
  stepsList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: "row",
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: COLORS.background.white,
    fontSize: 14,
    fontWeight: "600",
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 24,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5722",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  editButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
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
});
