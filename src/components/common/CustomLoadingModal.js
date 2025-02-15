import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Get screen dimensions
const { width } = Dimensions.get("window");

/**
 * Custom loading modal component that shows an animated loading state
 * @param {boolean} visible - Controls the visibility of the modal
 * @param {string} message - Message to display under the loading animation
 * @param {string} icon - Optional icon name from MaterialCommunityIcons
 */
const CustomLoadingModal = ({
  visible,
  message = "Yükleniyor...",
  icon = "cloud-upload",
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <View style={styles.content}>
          <Animatable.View
            animation="pulse"
            easing="ease-out"
            iterationCount="infinite"
            duration={2000}
            style={styles.iconContainer}
          >
            <MaterialCommunityIcons name={icon} size={50} color="#FF5722" />
          </Animatable.View>

          <Animatable.View animation="fadeIn" duration={800} delay={300}>
            <Text style={styles.message}>{message}</Text>
          </Animatable.View>

          <Animatable.View
            animation="fadeIn"
            duration={1000}
            delay={600}
            style={styles.loadingDotsContainer}
          >
            {[0, 1, 2].map((_, index) => (
              <Animatable.View
                key={index}
                animation="fadeIn"
                iterationCount="infinite"
                duration={1000}
                delay={index * 200}
                style={styles.loadingDot}
              />
            ))}
          </Animatable.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: width * 0.8,
    maxWidth: 300,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 87, 34, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 15,
  },
  loadingDotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 20,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5722",
    marginHorizontal: 3,
    opacity: 0.6,
  },
});

export default CustomLoadingModal;
