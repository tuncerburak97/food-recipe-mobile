import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import * as Animatable from "react-native-animatable";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const AnimatedSplash = ({ onAnimationEnd }) => {
  useEffect(() => {
    // Animasyon bittiğinde callback'i çağır
    const timer = setTimeout(() => {
      onAnimationEnd?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <View style={styles.container}>
      {/* Arka plan gradient efekti */}
      <Animatable.View
        animation="fadeIn"
        duration={1000}
        style={styles.background}
      />

      {/* Ana logo animasyonu */}
      <Animatable.View
        animation="zoomIn"
        duration={800}
        delay={200}
        style={styles.logoContainer}
      >
        <MaterialCommunityIcons
          name="silverware-fork-knife"
          size={80}
          color="#FF5722"
        />
      </Animatable.View>

      {/* Dekoratif elementler */}
      <Animatable.View
        animation="fadeIn"
        duration={600}
        delay={600}
        style={[styles.decorativeElement, styles.topLeft]}
      >
        <MaterialCommunityIcons
          name="food-turkey"
          size={40}
          color="rgba(255, 87, 34, 0.3)"
        />
      </Animatable.View>

      <Animatable.View
        animation="fadeIn"
        duration={600}
        delay={800}
        style={[styles.decorativeElement, styles.topRight]}
      >
        <MaterialCommunityIcons
          name="food"
          size={40}
          color="rgba(255, 87, 34, 0.3)"
        />
      </Animatable.View>

      <Animatable.View
        animation="fadeIn"
        duration={600}
        delay={1000}
        style={[styles.decorativeElement, styles.bottomLeft]}
      >
        <MaterialCommunityIcons
          name="pasta"
          size={40}
          color="rgba(255, 87, 34, 0.3)"
        />
      </Animatable.View>

      <Animatable.View
        animation="fadeIn"
        duration={600}
        delay={1200}
        style={[styles.decorativeElement, styles.bottomRight]}
      >
        <MaterialCommunityIcons
          name="food-croissant"
          size={40}
          color="rgba(255, 87, 34, 0.3)"
        />
      </Animatable.View>

      {/* Alt çizgi animasyonu */}
      <Animatable.View
        animation="fadeInUpBig"
        duration={800}
        delay={1400}
        style={styles.bottomLine}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  background: {
    position: "absolute",
    width,
    height,
    backgroundColor: "#1A1A1A",
    opacity: 0.95,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 87, 34, 0.1)",
  },
  decorativeElement: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  topLeft: {
    top: height * 0.2,
    left: width * 0.2,
  },
  topRight: {
    top: height * 0.2,
    right: width * 0.2,
  },
  bottomLeft: {
    bottom: height * 0.2,
    left: width * 0.2,
  },
  bottomRight: {
    bottom: height * 0.2,
    right: width * 0.2,
  },
  bottomLine: {
    position: "absolute",
    bottom: height * 0.15,
    width: width * 0.3,
    height: 2,
    backgroundColor: "#FF5722",
  },
});

export default AnimatedSplash;
