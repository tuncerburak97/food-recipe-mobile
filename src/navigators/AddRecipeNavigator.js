import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import AddRecipeScreen from "../screens/AddRecipeScreen";

const Stack = createStackNavigator();

export default function AddRecipeNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AddRecipe"
        component={AddRecipeScreen}
        options={{
          headerTitle: "Tarif Ekleme",
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: "#FF5722",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />
    </Stack.Navigator>
  );
}
