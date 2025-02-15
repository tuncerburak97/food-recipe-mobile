import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import * as Animatable from "react-native-animatable";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

/**
 * Custom toast component that shows a temporary message with an icon
 * @param {string} message - Message to display in the toast
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms before toast disappears
 * @param {Function} onHide - Callback function when toast is hidden
 */
const CustomToast = ({
  message,
  type = "success",
  duration = 3000,
  onHide,
}) => {
  const fadeAnim = useRef(null);

  // Toast configurations based on type
  const toastConfigs = {
    success: {
      icon: "check-circle-outline",
      color: "#2ECC71",
      backgroundColor: "rgba(46, 204, 113, 0.15)",
    },
    error: {
      icon: "close-circle-outline",
      color: "#E74C3C",
      backgroundColor: "rgba(231, 76, 60, 0.15)",
    },
    warning: {
      icon: "alert-circle-outline",
      color: "#F1C40F",
      backgroundColor: "rgba(241, 196, 15, 0.15)",
    },
    info: {
      icon: "information-outline",
      color: "#3498DB",
      backgroundColor: "rgba(52, 152, 219, 0.15)",
    },
  };

  const config = toastConfigs[type];

  useEffect(() => {
    // Animate in
    fadeAnim.current?.fadeInDown(400);

    // Set timeout for animate out
    const timer = setTimeout(() => {
      fadeAnim.current?.fadeOutUp(400).then(() => {
        onHide?.();
      });
    }, duration - 400);

    return () => clearTimeout(timer);
  }, [duration, onHide]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Animatable.View
        ref={fadeAnim}
        style={[styles.toast, { backgroundColor: config.backgroundColor }]}
      >
        <MaterialCommunityIcons
          name={config.icon}
          size={24}
          color={config.color}
          style={styles.icon}
        />
        <Text style={[styles.message, { color: config.color }]}>{message}</Text>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    width: "100%",
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  icon: {
    marginRight: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    letterSpacing: 0.3,
  },
});

export default CustomToast;
