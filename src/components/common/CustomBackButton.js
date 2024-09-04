import { StyleSheet, TouchableOpacity, View } from "react-native";
import { React } from "react";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";

export default function CustomBackButton({ size, color }) {
  const navigation = useNavigation();

  function handlePress() {
    navigation.goBack();
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <AntDesign name="left" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 30,
    marginLeft: 5,
    marginTop: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
