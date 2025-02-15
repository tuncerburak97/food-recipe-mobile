import React from "react";
import { View, Text, StyleSheet, Platform, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";

const { width } = Dimensions.get("window");

const EnhancedHeader = () => {
  return (
    <Animatable.View animation="fadeIn" duration={800} style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
          <Text style={styles.titleText}>Yemek Tarifi Rehberi</Text>
        </View>

        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="chef-hat" size={32} color="#FF5722" />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={20}
            color="#FF5722"
          />
          <Text style={styles.statText}>Binlerce Tarif</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name="account-group"
            size={20}
            color="#FF5722"
          />
          <Text style={styles.statText}>Uzman Şefler</Text>
        </View>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: "#FFF",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  titleContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  titleText: {
    fontSize: 24,
    fontWeight: Platform.OS === "ios" ? "800" : "bold",
    color: "#333",
    letterSpacing: -0.5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 87, 34, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  statText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 15,
  },
});

export default EnhancedHeader;
