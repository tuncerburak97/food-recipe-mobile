import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import HomeNavigator from "./HomeNavigator";
import UserNavigator from "./UserNavigator";
import AddRecipeNavigator from "./AddRecipeNavigator";
import { Entypo } from "@expo/vector-icons";
import FoodDetailScreen from "../screens/FoodDetailScreen";
import EditRecipeScreen from "../screens/EditRecipeScreen";
import ChefRecipesScreen from "../screens/ChefRecipesScreen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import CustomTabBarButton from "../components/common/CustomTabBarButton";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Ana Sayfa"
      screenOptions={{
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#FF5722",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="Ana Sayfa"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={styles.iconContainer}>
              <Entypo name="home" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Tarif Ekle"
        component={AddRecipeNavigator}
        options={{
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
        screenOptions={{
          presentation: "modal",
        }}
      />
      <Tab.Screen
        name="UserScreen"
        component={UserNavigator}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="chef-hat" size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Tab Navigator"
        component={TabNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={FoodDetailScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="EditRecipe"
        component={EditRecipeScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="ChefRecipes"
        component={ChefRecipesScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    position: "absolute",
    left: 0,
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingHorizontal: 20,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    top: 10,
  },
});
