import axios from "axios";
import { Alert } from "react-native";

const BASE_URL = "http://34.229.68.3:8080";

const TIMEOUT = 60000;

const getAxiosInstance = () => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
  });

  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      return handleRequestError(error);
    }
  );

  return instance;
};

const handleRequestError = (error) => {
  if (error.response) {
    return Promise.reject(error.response.data.errorMessage);
  } else if (error.request) {
    return Promise.reject("İstek yapılamadı");
  } else {
    return Promise.reject("Genel bir hata oluştu");
  }
};

export default getAxiosInstance;
