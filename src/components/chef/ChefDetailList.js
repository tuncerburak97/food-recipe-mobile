import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";

const ChefDetailList = ({ chefs, onPress }) => {
  return (
    <View style={styles.container}>
      {chefs.map((chef) => (
        <TouchableOpacity
          key={chef.id}
          style={styles.item}
          onPress={() => onPress(chef)}
        >
          <Image
            source={require("../images/cooking.png")}
            style={styles.image}
          />
          <View style={styles.textContainer}>
            <Text style={styles.text}>{chef.chef}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 10,
  },
  item: {
    flexDirection: "row",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    marginBottom: 10,
    alignItems: "center",
  },
  textContainer: {
    marginLeft: 10,
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});

export default ChefDetailList;
