// src/screens/TutorialScreen.js
import React, { useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";

const TutorialScreen = () => {
  const [step, setStep] = useState(1);
  const navigation = useNavigation();
  const nextStep = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Tutorial tamamlandı, AsyncStorage'a kaydet
      await AsyncStorage.setItem("tutorialCompleted", "true");
      // Ana ekrana yönlendir
      navigation.navigate("Home");
    }
  };

  return (
    <View style={styles.container}>
      {step === 1 && (
        <Text>Adım 1: Uygulamanın nasıl çalıştığını öğrenin.</Text>
      )}
      {step === 2 && <Text>Adım 2: Özellikleri keşfedin.</Text>}
      {step === 3 && <Text>Adım 3: Hemen kullanmaya başlayın.</Text>}
      <Button title="Devam" onPress={nextStep} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TutorialScreen;
