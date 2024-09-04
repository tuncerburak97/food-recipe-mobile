import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";

const SwipeableItem = ({ children, onDelete }) => {
  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-75, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <RectButton style={styles.rightAction} onPress={onDelete}>
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          Sil
        </Animated.Text>
      </RectButton>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>{children}</Swipeable>
  );
};

const styles = StyleSheet.create({
  rightAction: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    height: "70%",
    borderRadius: 20,
    marginTop: 18,
    marginRight: 5,
  },
  actionText: {
    color: "white",
    fontWeight: "bold",
    padding: 10,
  },
});

export default SwipeableItem;
