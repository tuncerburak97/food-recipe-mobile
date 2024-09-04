import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import UserScreen from "../screens/UserScreen";

const Stack = createStackNavigator();

export default function UserNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Şef Listesi"
        component={UserScreen}
        options={{
          headerTitleAlign: "center", // Başlığı ortalar
          headerStyle: {
            backgroundColor: "#FF5722", // Arka plan rengi
          },
          headerTintColor: "#fff", // Başlık metin rengi
          headerTitleStyle: {
            fontWeight: "bold", // Başlık metin stilini kalın yapar
          },
        }}
      />
    </Stack.Navigator>
  );
}
