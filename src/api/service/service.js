import getAxiosInstance from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AddRecipe = async (recipe) => {
  const instance = getAxiosInstance();
  const data = await instance.post("/food-recipe", recipe);
  return data;
};

export const GetRecipes = async () => {
  const instance = getAxiosInstance();
  const deviceId = await AsyncStorage.getItem("deviceId");
  const data = await instance.get(`/food-recipe/deviceId/${deviceId}`);
  return data;
};

export const GetRecipeById = async (id) => {
  const instance = getAxiosInstance();
  const deviceId = await AsyncStorage.getItem("deviceId");
  const data = await instance.get(`/food-recipe/${id}/user/${deviceId}`);
  return data;
};

export const UpdateRecipe = async (recipe) => {
  const instance = getAxiosInstance();
  const data = await instance.put("/food-recipe", recipe);
  return data;
};

export const GetChefs = async () => {
  const instance = getAxiosInstance();
  const data = await instance.get("/chef");
  return data;
};

export const GetChefRecipes = async (chefName) => {
  const instance = getAxiosInstance();
  const data = await instance.get(`/chef/${chefName}`);
  return data;
};

export const GetLatestVersion = async () => {
  const instance = getAxiosInstance();
  const response = await instance.get("/mobile-version/latest");
  return response.data.version;
};

export const GetRecipesByDeviceId = async () => {
  const instance = getAxiosInstance();
  const deviceId = await AsyncStorage.getItem("deviceId");
  const data = await instance.get(`/food-recipe/user/${deviceId}`);
  return data;
};

export const DeleteRecipe = async (id) => {
  const instance = getAxiosInstance();
  const deviceId = await AsyncStorage.getItem("deviceId");
  const data = await instance.delete("/food-recipe", {
    data: { id, uploaded_user_device_id: deviceId },
  });
  return data;
};
