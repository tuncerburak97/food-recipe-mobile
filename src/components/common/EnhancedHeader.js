import React from "react";
import { View, Text, StyleSheet, Platform, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import Colors from "../../constants/Colors";

const { width } = Dimensions.get("window");

const EnhancedHeader = ({ recipeCount = 0, chefCount = 0 }) => {
  return (
    <Animatable.View animation="fadeIn" duration={800} style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
          <Text style={styles.titleText}>Yemek Tarifi Rehberi</Text>
        </View>

        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="chef-hat"
            size={32}
            color={Colors.primary}
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Animatable.View animation="fadeIn" delay={400} style={styles.statItem}>
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.statText}>
            {recipeCount > 0 ? `${recipeCount} Tarif` : "Binlerce Tarif"}
          </Text>
        </Animatable.View>

        <View style={styles.divider} />

        <Animatable.View animation="fadeIn" delay={600} style={styles.statItem}>
          <MaterialCommunityIcons
            name="account-group"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.statText}>
            {chefCount > 0 ? `${chefCount} Şef` : "Uzman Şefler"}
          </Text>
        </Animatable.View>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: Colors.background,
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
    color: Colors.text.secondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  titleText: {
    fontSize: 24,
    fontWeight: Platform.OS === "ios" ? "800" : "bold",
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow.light.shadowColor,
        shadowOffset: Colors.shadow.light.shadowOffset,
        shadowOpacity: Colors.shadow.light.shadowOpacity,
        shadowRadius: Colors.shadow.light.shadowRadius,
      },
      android: {
        elevation: Colors.shadow.light.elevation,
      },
    }),
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
    backgroundColor: Colors.backgroundLight,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 15,
  },
});

export default EnhancedHeader;
