import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";

const FoodCategoryGridTile = ({ title, icon, onSelect, isSelected }) => {
  return (
    <TouchableOpacity
      style={[styles.gridItem, isSelected && styles.selectedItem]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={[styles.container, isSelected && styles.selectedContainer]}>
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={isSelected ? Colors.primary : Colors.text.secondary}
          style={styles.icon}
        />
        <Text style={[styles.title, isSelected && styles.selectedTitle]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridItem: {
    height: 80,
    width: 80,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
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
  selectedItem: {
    backgroundColor: Colors.primaryLight,
  },
  container: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedContainer: {
    backgroundColor: Colors.primaryLight,
  },
  icon: {
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text.secondary,
    textAlign: "center",
  },
  selectedTitle: {
    color: Colors.primary,
    fontWeight: "700",
  },
});

export default FoodCategoryGridTile;
