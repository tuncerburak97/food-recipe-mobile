import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import CustomSearchBar from "../components/common/CustomSearchBar";
import { GetChefs } from "../api/service/service";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import cookingIcon from "../images/cooking.png";

const UserScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [chefs, setChefs] = useState([]);
  const [filteredChefs, setFilteredChefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const fetchChefs = async () => {
    setLoading(true);
    try {
      const response = await GetChefs();
      if (response.data.chefs != null) {
        setChefs(response.data.chefs);
        setFilteredChefs(response.data.chefs);
      }
    } catch (error) {
      console.error("Error fetching chefs:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChefs();
    }, [])
  );

  useEffect(() => {
    const filtered = chefs.filter((chef) =>
      chef.chef.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredChefs(filtered);
  }, [searchQuery, chefs]);

  const handlePress = (chef) => {
    navigation.navigate("ChefRecipes", { chefName: chef.chef });
  };

  const renderChefItem = ({ item }) => (
    <TouchableOpacity style={styles.chefItem} onPress={() => handlePress(item)}>
      <View style={styles.iconContainer}>
        <Image source={cookingIcon} style={styles.icon} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.chefName}>{item.chef}</Text>
        <Text style={styles.recipeCount}>
          Toplam tarif sayısı: {item.recipe_count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <CustomSearchBar
          placeholder="Şef ara..."
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          clearSearch={() => setSearchQuery("")}
        />
      </View>
      {loading ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
        </View>
      ) : (
        <FlatList
          data={filteredChefs}
          keyExtractor={(item) => item.id}
          renderItem={renderChefItem}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Şef bulunamadı.</Text>
            </View>
          )}
          contentContainerStyle={styles.flatListContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF", // Arka plan rengini beyaz yaparak diğer arka plan renklerini kaldırdık
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchBarContainer: {
    marginBottom: 20,
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
  chefItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FAFAFA", // Bileşenin arka plan rengini beyaz yaparak daha görünür hale getirdik
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginRight: 15,
  },
  icon: {
    width: 40,
    height: 40,
  },
  textContainer: {
    flex: 1,
  },
  chefName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  recipeCount: {
    fontSize: 14,
    color: "#555",
  },
});

export default UserScreen;
