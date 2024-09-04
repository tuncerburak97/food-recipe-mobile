import React from "react";
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function SearchBar({
  placeholder,
  setSearchQuery,
  searchQuery,
  clearSearch,
}) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="search" size={24} color="black" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery ? (
        <TouchableOpacity onPress={clearSearch}>
          <MaterialIcons name="close" size={24} color="black" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    marginVertical: 10,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  input: {
    marginLeft: 10,
    flex: 1,
  },
});
