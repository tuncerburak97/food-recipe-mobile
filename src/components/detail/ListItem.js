import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AntDesign } from "@expo/vector-icons";

export default function ListItem({
  image,
  header,
  data,
  initiallyExpanded = true,
  noNumbers = false,
}) {
  const [showItems, setShowItems] = useState(initiallyExpanded);

  useEffect(() => {
    setShowItems(initiallyExpanded);
  }, [initiallyExpanded]);

  const toggleItems = () => {
    setShowItems(!showItems);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleItems} style={styles.header}>
        <View style={styles.headerMetadata}>
          {image}
          <Text style={styles.titleText}>{header}</Text>
        </View>
        <AntDesign name={showItems ? "up" : "down"} size={22} color="black" />
      </TouchableOpacity>
      {showItems &&
        data.map((item, index) => (
          <View style={styles.contentContainer} key={index}>
            {!noNumbers && <Text>{index + 1}. </Text>}
            <Text>{item}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginVertical: 10,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "black",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  headerMetadata: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentContainer: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
});
