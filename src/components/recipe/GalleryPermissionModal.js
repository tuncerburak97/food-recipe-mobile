import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

const GalleryPermissionModal = ({ visible, onClose }) => {
  const [requestedBefore, setRequestedBefore] = useState(false);

  const handlePermissionRequest = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === "granted") {
      onClose(); // İzin verildiyse modal kapatılır
    } else {
      setRequestedBefore(true); // İzin verilmediyse, ayarlara yönlendirme yapılır
    }
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Image
            source={require("../../images/addRecipe/gallery.png")}
            style={styles.icon}
          />
          <Text style={styles.title}>Galeri Erişimine İzin Verin</Text>
          <Text style={styles.description}>
            Uygulamamız, yemek tariflerinizi paylaşabilmeniz için galeriye
            erişim izni gerektirmektedir. Bu izin sayesinde:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>
              • Yemek tariflerinizin fotoğraflarını seçip uygulamaya
              yükleyebilirsiniz.
            </Text>
            <Text style={styles.bulletPoint}>
              • Kendi tariflerinizi oluşturmak için ekran görüntüsü aldığınız
              yemek fotoğraflarını kullanabilirsiniz.
            </Text>
            <Text style={styles.bulletPoint}>
              • Yüklediğiniz tarifleri galerinize kaydedip daha sonra
              erişebilirsiniz.
            </Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (!requestedBefore) {
                  handlePermissionRequest();
                } else {
                  Linking.openSettings();
                  onClose();
                }
              }}
            >
              <Text style={styles.buttonText}>
                {requestedBefore ? "Ayarlar" : "Devam Et"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  icon: {
    width: 50,
    height: 50,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    textAlign: "center", // Align text to center
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  bulletPoints: {
    marginLeft: 10, // Indentation for bullet points
    marginBottom: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10, // Add spacing between bullet points
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  button: {
    backgroundColor: "#FF5722",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    margin: 5,
  },
  cancelButton: {
    backgroundColor: "#ddd",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default GalleryPermissionModal;
