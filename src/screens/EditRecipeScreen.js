import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { GetRecipeById, UpdateRecipe } from "../api/service/service";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomBackButton from "../components/common/CustomBackButton";
import MainInfoSection from "../components/recipe/MainInfoSection";
import EditableSection from "../components/recipe/EditableSection";
import CustomAlert from "../components/common/CustomAlert"; // CustomAlert import

const EditRecipeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [alert, setAlert] = useState({ visible: false, type: "", message: "" }); // CustomAlert state

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

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await UpdateRecipe(recipe);
      setAlert({
        visible: true,
        type: "success",
        message: "Tarif başarıyla güncellendi!",
      });
    } catch (error) {
      console.error("Error updating recipe:", error);
      setAlert({
        visible: true,
        type: "error",
        message: "Tarif güncellenirken bir hata oluştu!",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleMainInfoChange = (name, value) => {
    setRecipe((prevRecipe) => ({ ...prevRecipe, [name]: value }));
  };

  const addMaterial = () => {
    setRecipe((prevRecipe) => ({
      ...prevRecipe,
      materials: [...prevRecipe.materials, ""],
    }));
  };

  const removeMaterial = (index) => {
    setRecipe((prevRecipe) => {
      const newMaterials = [...prevRecipe.materials];
      newMaterials.splice(index, 1);
      return { ...prevRecipe, materials: newMaterials };
    });
  };

  const handleMaterialChange = (index, value) => {
    setRecipe((prevRecipe) => {
      const newMaterials = [...prevRecipe.materials];
      newMaterials[index] = value;
      return { ...prevRecipe, materials: newMaterials };
    });
  };

  const addRecipeStep = () => {
    setRecipe((prevRecipe) => ({
      ...prevRecipe,
      recipes: [...prevRecipe.recipes, ""],
    }));
  };

  const removeRecipeStep = (index) => {
    setRecipe((prevRecipe) => {
      const newRecipes = [...prevRecipe.recipes];
      newRecipes.splice(index, 1);
      return { ...prevRecipe, recipes: newRecipes };
    });
  };

  const handleRecipeStepChange = (index, value) => {
    setRecipe((prevRecipe) => {
      const newRecipes = [...prevRecipe.recipes];
      newRecipes[index] = value;
      return { ...prevRecipe, recipes: newRecipes };
    });
  };

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <CustomBackButton size={18} color="black" />
            <Text style={styles.headerTitle}>Tarifi Güncelle</Text>
          </View>
          <View style={styles.spacer} />
          <View style={styles.container}>
            <MainInfoSection recipe={recipe} onChange={handleMainInfoChange} />
            <EditableSection
              title="Malzemeler"
              data={recipe.materials}
              placeholder="Malzeme"
              onAddItem={addMaterial}
              onRemoveItem={removeMaterial}
              onChangeText={handleMaterialChange}
            />
            <EditableSection
              title="Yapılış Adımları"
              data={recipe.recipes}
              placeholder="Adım"
              onAddItem={addRecipeStep}
              onRemoveItem={removeRecipeStep}
              onChangeText={handleRecipeStepChange}
              multiline
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleUpdate}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Tarifi Güncelle</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
      {alert.visible && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => {
            setAlert({ visible: false, type: "", message: "" });
            if (alert.type === "success") {
              navigation.navigate("Home");
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#333",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spacer: {
    height: 40, // Boşluk eklemek için ayarlanabilir
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

export default EditRecipeScreen;
