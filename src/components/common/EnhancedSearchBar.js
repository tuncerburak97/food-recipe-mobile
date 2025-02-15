import React from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";

const { width } = Dimensions.get("window");

const EnhancedSearchBar = ({ searchQuery, setSearchQuery, clearSearch }) => {
  return (
    <Animatable.View
      animation="fadeInDown"
      duration={800}
      delay={200}
      style={styles.container}
    >
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={24}
          color="#666"
          style={styles.searchIcon}
        />

        <TextInput
          style={styles.input}
          placeholder="Tarif veya malzeme ara..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.filterButton}>
        <MaterialCommunityIcons
          name="tune-vertical"
          size={24}
          color="#FF5722"
        />
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFF",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 10,
    fontWeight: "500",
  },
  clearButton: {
    padding: 5,
  },
  filterButton: {
    marginLeft: 15,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(255, 87, 34, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});

export default EnhancedSearchBar;
