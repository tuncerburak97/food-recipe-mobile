import axios from "axios";
import { Alert } from "react-native";

const BASE_URL = "https://api.food-recipe-generator.xyz";

//const BASE_URL = "http://192.168.1.50:8080";

const TIMEOUT = 60000;

// Global state for error modal
let errorModalCallback = null;

// Function to set error modal callback
export const setErrorModalCallback = (callback) => {
  errorModalCallback = callback;
};

const getAxiosInstance = () => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // You can add authentication headers or other request modifications here
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
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
  let errorMessage = "İşleminize şu an devam edemiyoruz.";

  if (error.response) {
    console.log(error.response);
    // Server responded with error
    if (error.response.data && error.response.data.errorMessage) {
      errorMessage = error.response.data.errorMessage;
    } else {
      switch (error.response.status) {
        case 400:
          errorMessage = "Geçersiz istek yapıldı.";
          break;
        case 401:
          errorMessage =
            "Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.";
          break;
        case 403:
          errorMessage = "Bu işlem için yetkiniz bulunmuyor.";
          break;
        case 404:
          errorMessage = "İstenilen kaynak bulunamadı.";
          break;
        case 500:
          errorMessage =
            "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
          break;
        default:
          errorMessage = "Beklenmeyen bir hata oluştu.";
      }
    }
  } else if (error.request) {
    errorMessage = "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.";
  }

  // Show error modal if callback is set
  if (errorModalCallback) {
    errorModalCallback(errorMessage);
  }

  return Promise.reject(errorMessage);
};

export default getAxiosInstance;
