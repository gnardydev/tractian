import axios from 'axios';

// URL base da API fornecida do git
const API_URL = 'https://fake-api.tractian.com';

// Função para obter todas as empresas listadas na API
export const getCompanies = async () => {
  return axios.get(`${API_URL}/companies`);
};

// Função para obter todas as localizações de uma empresa específica pelo ID
export const getCompanyLocations = async (companyId) => {
  return axios.get(`${API_URL}/companies/${companyId}/locations`);
};

// Função para obter todos os ativos de uma empresa específica pelo ID
export const getCompanyAssets = async (companyId) => {
  return axios.get(`${API_URL}/companies/${companyId}/assets`);
};
