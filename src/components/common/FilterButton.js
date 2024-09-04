import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Modal, Text } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";

const FilterButton = ({ chefs, setFilteredChefs }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChefs, setSelectedChefs] = useState([]);

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const handleCheckboxChange = (chef) => {
    setSelectedChefs((prevSelected) => {
      if (prevSelected.includes(chef)) {
        return prevSelected.filter((item) => item !== chef);
      } else {
        return [...prevSelected, chef];
      }
    });
  };

  const applyFilter = () => {
    const filteredChefs = chefs.filter((chef) =>
      selectedChefs.includes(chef.chef)
    );
    setFilteredChefs(filteredChefs);
    toggleModal();
  };

  return (
    <View>
      <TouchableOpacity onPress={toggleModal} style={styles.button}>
        <FontAwesome name="filter" size={24} color="#000" />
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={toggleModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrele</Text>
            {chefs.map((chef) => (
              <View key={chef.id} style={styles.checkboxContainer}>
                <Checkbox
                  value={selectedChefs.includes(chef.chef)}
                  onValueChange={() => handleCheckboxChange(chef.chef)}
                  color={
                    selectedChefs.includes(chef.chef) ? "#FF5722" : undefined
                  }
                />
                <Text style={styles.checkboxLabel}>{chef.chef}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={applyFilter} style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#FFF",
    borderRadius: 5,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
  },
  applyButton: {
    marginTop: 20,
    backgroundColor: "#FF5722",
    padding: 10,
    borderRadius: 5,
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default FilterButton;
