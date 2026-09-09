import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const client   = axios.create({ baseURL: BASE_URL, timeout: 10000, withCredentials: true });
const aiClient = axios.create({ baseURL: BASE_URL, timeout: 60000, withCredentials: true });

export const api = {
  get:   async (path)       => (await client.get(path)).data,
  post:  async (path, data) => (await (path.includes('ai/') ? aiClient : client).post(path, data)).data,
  del:   async (path)       => (await client.delete(path)).data,
  patch: async (path, data) => (await client.patch(path, data)).data,
};
