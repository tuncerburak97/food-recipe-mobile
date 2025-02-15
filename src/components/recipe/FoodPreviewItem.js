import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import * as Animatable from "react-native-animatable";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32; // 16 padding on each side

const FoodPreviewItem = ({
  id,
  name,
  category,
  chef,
  labels = [],
  duration,
  image,
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate("RecipeDetail", { recipeId: id });
  };

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={500}
      delay={200}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Image source={{ uri: image }} style={styles.image} />

        <View style={styles.overlay}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleGroup}>
                <Text style={styles.category}>{category}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {name}
                </Text>
              </View>

              <View style={styles.durationContainer}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color={Colors.text.white}
                />
                <Text style={styles.duration}>{duration} dk</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.chefContainer}>
                <MaterialCommunityIcons
                  name="chef-hat"
                  size={16}
                  color={Colors.text.white}
                  style={styles.chefIcon}
                />
                <Text style={styles.chef}>{chef}</Text>
              </View>

              {labels.length > 0 && (
                <View style={styles.labels}>
                  {labels.map((label, index) => (
                    <View key={index} style={styles.label}>
                      <Text style={styles.labelText}>{label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: 16,
    alignSelf: "center",
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.background,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow.light.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  image: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleGroup: {
    flex: 1,
    marginRight: 12,
  },
  category: {
    color: Colors.text.white,
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: Colors.text.white,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  chefContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  chefIcon: {
    marginRight: 6,
  },
  chef: {
    color: Colors.text.white,
    fontSize: 13,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  duration: {
    color: Colors.text.white,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  labels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
    marginLeft: 12,
    justifyContent: "flex-end",
  },
  label: {
    backgroundColor: "rgba(255, 87, 34, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  labelText: {
    color: Colors.text.white,
    fontSize: 13,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default FoodPreviewItem;
