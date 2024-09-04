import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Modal from "react-native-modal";
import { AntDesign } from "@expo/vector-icons";

const CustomAlert = ({ type, message, onClose }) => {
  const icon = type === "success" ? "checkcircle" : "closecircle";
  const iconColor = type === "success" ? "#4CAF50" : "#F44336";

  return (
    <Modal isVisible={true} backdropOpacity={0.5}>
      <View style={styles.container}>
        <AntDesign name={icon} size={64} color={iconColor} />
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Tamam</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginVertical: 20,
  },
  closeButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CustomAlert;
