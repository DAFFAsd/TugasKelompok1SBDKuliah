import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Subject {
  _id?: string;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const api = {
  // Get all subjects
  getSubjects: async (): Promise<Subject[]> => {
    const response = await axios.get(`${API_URL}/subjects`);
    return response.data;
  },

  // Get a subject by ID
  getSubject: async (id: string): Promise<Subject> => {
    const response = await axios.get(`${API_URL}/subjects/${id}`);
    return response.data;
  },

  // Create a new subject
  createSubject: async (subject: Subject): Promise<Subject> => {
    const response = await axios.post(`${API_URL}/subjects`, subject);
    return response.data;
  },

  // Update a subject
  updateSubject: async (id: string, subject: Subject): Promise<Subject> => {
    const response = await axios.put(`${API_URL}/subjects/${id}`, subject);
    return response.data;
  },

  // Delete a subject
  deleteSubject: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/subjects/${id}`);
  }
};

export default api;
