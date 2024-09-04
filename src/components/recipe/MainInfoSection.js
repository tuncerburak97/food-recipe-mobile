import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

const MainInfoSection = ({ recipe, onChange }) => {
  const handleChange = (name, value) => {
    onChange(name, value);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Ana Bilgiler</Text>
      <TextInput
        style={styles.input}
        value={recipe.name}
        onChangeText={(value) => handleChange("name", value)}
        placeholder="Tarif Adı"
      />
      <TextInput
        style={styles.input}
        value={recipe.category}
        onChangeText={(value) => handleChange("category", value)}
        placeholder="Kategori"
      />
      <TextInput
        style={styles.input}
        value={recipe.chef}
        onChangeText={(value) => handleChange("chef", value)}
        placeholder="Şef"
      />
      <TextInput
        style={styles.input}
        value={recipe.duration}
        onChangeText={(value) => handleChange("duration", value)}
        placeholder="Süre"
      />
      <TextInput
        style={styles.input}
        value={recipe.description}
        onChangeText={(value) => handleChange("description", value)}
        placeholder="Açıklama"
        multiline
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
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
  label: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginVertical: 5,
    backgroundColor: "#FFF",
  },
});

export default MainInfoSection;
