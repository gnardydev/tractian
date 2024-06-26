import axios from 'axios';

// URL base da API fornecida do git
const API_URL = 'https://fake-api.tractian.com';

// Função para obter todas as empresas listadas na api
export const getCompanies = async () => {
  return axios.get(`${API_URL}/companies`);
};

// Função para obter todas as localizações de uma empresa específica pelo id
export const getCompanyLocations = async (companyId) => {
  return axios.get(`${API_URL}/companies/${companyId}/locations`);
};

// Função para obter todos os ativos de uma empresa específica pelo id
export const getCompanyAssets = async (companyId) => {
  return axios.get(`${API_URL}/companies/${companyId}/assets`);
};