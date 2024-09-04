import { TouchableOpacity } from "react-native";
import React from "react";
import { Entypo } from "@expo/vector-icons";

export default function CustomTabBarButton({ children, onPress }) {
  return (
    <TouchableOpacity
      style={{
        width: 58,
        height: 58,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FF5722",
        borderRadius: 33,
        marginTop: -8,
        borderWidth: 3,
        borderColor: "white",
      }}
      onPress={onPress}
    >
      <Entypo name="plus" size={24} color="white" />
    </TouchableOpacity>
  );
}
