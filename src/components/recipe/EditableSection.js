import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";

const EditableSection = ({
  title,
  data,
  placeholder,
  onAddItem,
  onRemoveItem,
  onChangeText,
  multiline = false,
}) => {
  const renderItem = ({ item, index }) => (
    <View style={styles.itemContainer}>
      <TextInput
        style={styles.input}
        value={item}
        onChangeText={(value) => onChangeText(index, value)}
        placeholder={placeholder}
        multiline={multiline}
      />
      <TouchableOpacity
        onPress={() => onRemoveItem(index)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>Sil</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title}</Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${title}-${index}`}
        scrollEnabled={false} // Disable scrolling inside FlatList
      />
      <TouchableOpacity onPress={onAddItem} style={styles.addButton}>
        <Text style={styles.addButtonText}>Ekle</Text>
      </TouchableOpacity>
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
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#FFF",
  },
  removeButton: {
    backgroundColor: "#FF5722",
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  removeButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#FF5722",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

export default EditableSection;
