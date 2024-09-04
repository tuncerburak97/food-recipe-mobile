import { View, Text, StyleSheet } from "react-native";

export default function Header({ children }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 40,
    paddingTop: 15,
    marginLeft: 17,
    marginBottom: 15,
  },
  title: {
    color: "black",
    fontSize: 20,
    fontWeight: "bold",
  },
});
