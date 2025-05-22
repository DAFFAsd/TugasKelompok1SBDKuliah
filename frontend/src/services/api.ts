import axios from 'axios';

// Use relative URL for API requests to work with Nginx proxy
const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface ModuleFile {
  _id?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  createdAt?: Date;
  // created_by might also be relevant if needed by frontend
}

export interface Subject {
  _id?: string;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Module {
  _id?: string;
  title: string;
  content: string;
  class_id: string; // Should always be present for a module
  folder_id?: string | null;
  order_index?: number;
  created_by?: string; // User ID (string representation of ObjectId)
  createdAt?: Date;
  updatedAt?: Date;
  files?: ModuleFile[];
  // Fields from backend aggregation/lookups:
  creator_name?: string;
  class_title?: string;
  folder_title?: string;
}

export interface ModuleCreationPayload {
  title: string;
  content: string;
  class_id: string; // Mandatory for creating a module
  folder_id?: string | null;
  order_index?: number;
  // Files are handled separately via FormData in actual component, not in this JSON payload typically
}

export interface ModuleUpdatePayload {
  title?: string;
  content?: string;
  folder_id?: string | null; // Allow unsetting or changing folder
  order_index?: number;
  // Files update logic might be more complex (e.g., sending arrays of files to keep/add/remove)
  // For simplicity, this payload focuses on core module fields. File management might need dedicated endpoints or logic.
}

const api = {
  // Get all modules
  getModules: async (): Promise<Module[]> => {
    const response = await axios.get(`${API_URL}/modules`);
    return response.data;
  },

  // Get a module by ID
  getModule: async (id: string): Promise<Module> => {
    const response = await axios.get(`${API_URL}/modules/${id}`);
    return response.data;
  },

  // Create a new module
  // Note: File uploads for modules are typically handled with FormData.
  // This function assumes the module data (title, content, class_id, etc.) is sent as JSON.
  // The actual component creating a module would construct FormData if files are included.
  createModule: async (moduleData: ModuleCreationPayload): Promise<Module> => {
    const response = await axios.post(`${API_URL}/modules`, moduleData, {
      withCredentials: true, // Ensure cookies (like auth token) are sent
    });
    return response.data;
  },

  // Update a module
  // Similar to createModule, file updates would typically use FormData.
  updateModule: async (id: string, moduleData: ModuleUpdatePayload): Promise<Module> => {
    const response = await axios.put(`${API_URL}/modules/${id}`, moduleData, {
      withCredentials: true,
    });
    return response.data;
  },

  // Delete a module
  deleteModule: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/modules/${id}`, {
      withCredentials: true,
    });
  }
  // TODO: Add functions for managing module files if needed (e.g., delete a specific file from a module)
  // Example: deleteModuleFile: async (moduleId: string, fileId: string): Promise<void> => { ... }
};

export default api;
