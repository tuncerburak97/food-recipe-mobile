import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Modal from "react-native-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GestureRecognizer from "react-native-swipe-gestures";

const { width, height } = Dimensions.get("window");

const tutorialData = [
  {
    title: "Ekran Görüntüsü Alma",
    image: require("../../images/screenshot.png"),
    description: [
      "Herhangi bir yemek tarifinin ekran görüntüsünü alın ve galerinize kaydedin.",
      "Galeriden yüklemek için Tarif Ekleme sayfasına gidin.",
      "Alınan görüntüyü galeri uygulamanızdan seçin.",
    ],
  },
  {
    title: "Tarif Yükleme",
    image: require("../../images/upload.png"),
    description: [
      "Tarif yüklemek için Tarif Ekleme sayfasını açın.",
      "Birden fazla tarif seçebilir ve aynı anda yükleyebilirsiniz.",
      "Yükledikten sonra tariflerinizin listesini görebilirsiniz.",
    ],
  },
  {
    title: "Tarifleri Yönetme",
    image: require("../../images/manage.png"),
    description: [
      "Yüklediğiniz tarifleri görmek için Tariflerim sekmesine gidin.",
      "Kendi yüklediğiniz tariflerinizi güncelleyebilir veya silebilirsiniz.",
      "Başka kullanıcıların yüklediği tarifleri görüntüleyebilirsiniz.",
      "Tarif detay sayfasında tariflerinizi yönetebilirsiniz.",
    ],
  },
];

export default function TutorialModal({ isVisible, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < tutorialData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem("tutorialCompleted", "true");
    onClose();
  };

  const renderItem = (item) => (
    <View style={styles.slide}>
      <Text style={styles.title}>{item.title}</Text>
      <Image source={item.image} style={styles.image} />
      <View style={styles.descriptionContainer}>
        {item.description.map((desc, index) => (
          <View key={index} style={styles.descriptionItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.description}>{desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Modal isVisible={isVisible} backdropOpacity={0.8} style={styles.modal}>
      <GestureRecognizer
        onSwipeLeft={handleNext}
        onSwipeRight={handlePrevious}
        config={{
          velocityThreshold: 0.3,
          directionalOffsetThreshold: 80,
        }}
        style={styles.container}
      >
        {renderItem(tutorialData[currentIndex])}
        <View style={styles.buttonContainer}>
          {currentIndex === tutorialData.length - 1 ? (
            <TouchableOpacity style={styles.button} onPress={handleComplete}>
              <Text style={styles.buttonText}>Tamamla</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>İleri</Text>
            </TouchableOpacity>
          )}
        </View>
      </GestureRecognizer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  descriptionContainer: {
    width: "100%", // Description container genişliğini tam yap
    paddingHorizontal: 20, // Yatay padding ekleyerek içeriği daha iyi hizala
  },
  descriptionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5722",
    marginRight: 10,
    marginTop: 6,
  },
  description: {
    fontSize: 16,
    textAlign: "left",
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#FF5722",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
