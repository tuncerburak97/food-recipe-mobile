import { View, Text, StyleSheet } from "react-native";
import React from "react";

export default function Ingredients({ data, header }) {
  return (
    <View>
      <Text style={styles.text}>{header}</Text>
      {data.map((ingredient, index) => {
        return (
          <View style={styles.ingredients} key={index}>
            <View style={styles.icon}></View>
            <Text>{ingredient}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 15,
  },
  icon: {
    backgroundColor: "#FF5722",
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: "bold",
    padding: 15,
  },
  ingredients: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#E0E0E0",
    alignItems: "center",
    marginHorizontal: 15,
  },
});
