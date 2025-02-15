import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigators/RootNavigator";
import Constants from "expo-constants";
import { GetLatestVersion } from "./src/api/service/service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TutorialModal from "./src/components/common/TutorialModal";
import * as Application from "expo-application";
import ErrorModal from "./src/components/ErrorModal";
import { setErrorModalCallback } from "./src/api/api";
import { ToastProvider } from "./src/components/common/ToastManager";
import AnimatedSplash from "./src/components/common/AnimatedSplash";

export default function App() {
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([
          getUniqueId(),
          checkAppVersion(),
          checkTutorialStatus(),
        ]);
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    const getUniqueId = async () => {
      let uniqueId = null;

      if (Platform.OS === "android") {
        uniqueId = Application.getAndroidId();
      } else if (Platform.OS === "ios") {
        uniqueId = await Application.getIosIdForVendorAsync();
      } else {
        uniqueId = "Unsupported Platform";
      }
      await AsyncStorage.setItem("deviceId", uniqueId);
    };

    const checkAppVersion = async () => {
      try {
        const latestVersionCode = await GetLatestVersion();
        const currentVersionCode = Constants.expoConfig.android.versionCode;
        const lastCheckedVersionCode = await AsyncStorage.getItem(
          "lastCheckedVersionCode"
        );

        if (
          currentVersionCode < latestVersionCode &&
          lastCheckedVersionCode !== latestVersionCode.toString()
        ) {
          Alert.alert(
            "Güncelleme Mevcut",
            "Yeni bir sürüm mevcut. Lütfen uygulamayı güncelleyin.",
            [
              {
                text: "Güncelle",
                onPress: () =>
                  Linking.openURL(
                    "https://play.google.com/store/apps/details?id=com.tuncerburak97.foodrecipeaimobile"
                  ),
              },
              { text: "İptal", style: "cancel" },
            ],
            { cancelable: false }
          );

          await AsyncStorage.setItem(
            "lastCheckedVersionCode",
            latestVersionCode.toString()
          );
        }
      } catch (error) {
        console.error("Sürüm kontrolü başarısız:", error);
      }
    };

    const checkTutorialStatus = async () => {
      const tutorialCompleted = await AsyncStorage.getItem("tutorialCompleted");
      if (!tutorialCompleted) {
        setIsTutorialVisible(true);
      }
    };

    // Set up error modal callback
    setErrorModalCallback((message) => {
      setErrorMessage(message);
      setErrorModalVisible(true);
    });

    initializeApp();
  }, []);

  if (isLoading) {
    return <AnimatedSplash onAnimationEnd={() => setIsLoading(false)} />;
  }

  return (
    <ToastProvider>
      <NavigationContainer>
        <RootNavigator />
        <TutorialModal
          isVisible={isTutorialVisible}
          onClose={() => setIsTutorialVisible(false)}
        />
        <ErrorModal
          visible={errorModalVisible}
          message={errorMessage}
          onClose={() => setErrorModalVisible(false)}
        />
      </NavigationContainer>
    </ToastProvider>
  );
}
