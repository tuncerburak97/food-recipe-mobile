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
} from "react-native";
import CustomSearchBar from "../components/common/CustomSearchBar";
import { GetChefs } from "../api/service/service";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
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

const UserScreen = () => {
  const [chefs, setChefs] = useState([]);
  const [filteredChefs, setFilteredChefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const navigation = useNavigation();

  const fetchChefs = async () => {
    try {
      const response = await GetChefs();
      if (response.data.chefs) {
        setChefs(response.data.chefs);
        setFilteredChefs(response.data.chefs);
      }
    } catch (error) {
      console.error("Error fetching chefs:", error);
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChefs();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const filtered = chefs.filter((chef) =>
        chef.chef.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChefs(filtered);
    }, [searchQuery, chefs])
  );

  const handleChefPress = (chef) => {
    navigation.navigate("ChefRecipes", { chefName: chef.chef });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Şefler</Text>
      <Text style={styles.headerSubtitle}>
        En iyi şeflerimizin özel tariflerini keşfedin
      </Text>
    </View>
  );

  const renderChefItem = ({ item, index }) => (
    <View style={styles.chefItemContainer}>
      <TouchableOpacity
        style={styles.chefItem}
        onPress={() => handleChefPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chefAvatarContainer}>
          <MaterialCommunityIcons
            name="chef-hat"
            size={32}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.chefInfo}>
          <Text style={styles.chefName}>{item.chef}</Text>
          <Text style={styles.recipeCount}>{item.recipe_count} Tarif</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.text.light} />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="account-search"
        size={64}
        color={COLORS.text.light}
      />
      <Text style={styles.emptyTitle}>Şef Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Aradığınız kriterlere uygun şef bulunamadı
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Şefler Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.searchContainer}>
        <CustomSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Şef Ara..."
        />
      </View>
      <FlatList
        data={filteredChefs}
        renderItem={renderChefItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.white,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: COLORS.background.white,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  chefItemContainer: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  chefItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chefAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background.light,
    justifyContent: "center",
    alignItems: "center",
  },
  chefInfo: {
    flex: 1,
    marginLeft: 16,
  },
  chefName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  recipeCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 64,
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
});

export default UserScreen;
