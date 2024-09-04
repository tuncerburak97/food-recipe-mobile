import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

const SortButton = ({ sortChefs }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const applySort = (criteria) => {
    sortChefs(criteria);
    toggleModal();
  };

  return (
    <View>
      <TouchableOpacity onPress={toggleModal} style={styles.button}>
        <FontAwesome name="sort" size={24} color="#000" />
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={toggleModal}
      >
        <TouchableWithoutFeedback onPress={toggleModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sırala</Text>
              <TouchableOpacity
                onPress={() => applySort("name")}
                style={styles.optionButton}
              >
                <Text style={styles.optionText}>Şef Adı</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applySort("recipe_count")}
                style={styles.optionButton}
              >
                <Text style={styles.optionText}>Tarif Sayısı</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
    marginRight: 10,
  },
  modalOverlay: {
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
  optionButton: {
    marginVertical: 10,
  },
  optionText: {
    fontSize: 16,
  },
});

export default SortButton;
