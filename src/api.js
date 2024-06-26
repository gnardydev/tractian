import axios from 'axios';

const API_URL = 'https://fake-api.tractian.com';

// Função para obter as empresas
export const getCompanies = async () => {
  return await axios.get(`${API_URL}/companies`);
};

// Função para obter as localizações da empresa
export const getCompanyLocations = async (companyId) => {
  return await axios.get(`${API_URL}/companies/${companyId}/locations`);
};

// Função para obter os ativos da empresa com paginação
export const getCompanyAssetsPaginated = async (companyId, page, pageSize = 10) => {
  return await axios.get(`${API_URL}/companies/${companyId}/assets`, {
    params: { page, pageSize }
  });
};