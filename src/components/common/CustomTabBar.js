import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

const CustomTabBar = ({ selectedTab, setSelectedTab }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === "myRecipes" && styles.selectedTab]}
        onPress={() => setSelectedTab("myRecipes")}
      >
        <Text style={styles.tabText}>Tariflerim</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === "allRecipes" && styles.selectedTab]}
        onPress={() => setSelectedTab("allRecipes")}
      >
        <Text style={styles.tabText}>Tüm Tarifler</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 10,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#ccc",
  },
  selectedTab: {
    backgroundColor: "#ff5722",
  },
  tabText: {
    color: "#fff",
  },
});

export default CustomTabBar;
