import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import * as Animatable from "react-native-animatable";

const { width } = Dimensions.get("window");

const CustomTabBar = ({ selectedTab, setSelectedTab }) => {
  const tabs = [
    {
      id: "allRecipes",
      label: "Tüm Tarifler",
      icon: "book-open-variant",
    },
    {
      id: "myRecipes",
      label: "Tariflerim",
      icon: "bookmark-outline",
    },
  ];

  const renderTab = (tab) => {
    const isSelected = selectedTab === tab.id;

    return (
      <TouchableOpacity
        key={tab.id}
        style={[styles.tab, isSelected && styles.selectedTab]}
        onPress={() => setSelectedTab(tab.id)}
        activeOpacity={0.7}
      >
        <Animatable.View
          animation={isSelected ? "pulse" : undefined}
          duration={500}
          style={styles.tabContent}
        >
          <MaterialCommunityIcons
            name={tab.icon}
            size={24}
            color={isSelected ? Colors.primary : Colors.text.secondary}
            style={styles.icon}
          />
          <Text style={[styles.tabText, isSelected && styles.selectedTabText]}>
            {tab.label}
          </Text>

          {isSelected && (
            <Animatable.View
              animation="fadeIn"
              duration={300}
              style={styles.indicator}
            />
          )}
        </Animatable.View>
      </TouchableOpacity>
    );
  };

  return <View style={styles.container}>{tabs.map(renderTab)}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 6,
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
  tab: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  selectedTab: {
    backgroundColor: Colors.primaryLight,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  icon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.secondary,
  },
  selectedTabText: {
    color: Colors.primary,
    fontWeight: "700",
  },
  indicator: {
    position: "absolute",
    bottom: -12,
    left: "50%",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginLeft: -2,
  },
});

export default CustomTabBar;
