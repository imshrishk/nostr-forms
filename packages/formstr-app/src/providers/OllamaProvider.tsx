import React, { createContext, useState, useContext, ReactNode } from 'react';
import OllamaService from '../services/ollama';
import { getItem, setItem, LOCAL_STORAGE_KEYS } from '../utils/localStorage';
import axios from 'axios';

// Add Ollama settings to localStorage keys
if (!LOCAL_STORAGE_KEYS.OLLAMA_SETTINGS) {
  LOCAL_STORAGE_KEYS.OLLAMA_SETTINGS = 'formstr-ollama-settings';
}

interface OllamaContextType {
  ollamaService: OllamaService;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  models: string[];
  selectedModel: string;
  baseUrl: string;
  connect: (baseUrl: string) => Promise<void>;
  disconnect: () => void;
  setSelectedModel: (model: string) => void;
  testConnection: () => Promise<boolean>;
  fetchModels: () => Promise<string[]>;
}

const defaultOllamaContext: OllamaContextType = {
  ollamaService: new OllamaService(),
  isConnected: false,
  isLoading: false,
  error: null,
  models: [],
  selectedModel: 'llama2',
  baseUrl: 'http://localhost:11434',
  connect: async () => {},
  disconnect: () => {},
  setSelectedModel: () => {},
  testConnection: async () => false,
  fetchModels: async () => [],
};

export const OllamaContext = createContext<OllamaContextType>(defaultOllamaContext);

export const useOllama = () => useContext(OllamaContext);

interface OllamaProviderProps {
  children: ReactNode;
}

export const OllamaProvider: React.FC<OllamaProviderProps> = ({ children }) => {
  const savedSettings = getItem(LOCAL_STORAGE_KEYS.OLLAMA_SETTINGS) || {};
  
  const [ollamaService] = useState(new OllamaService({
    baseUrl: savedSettings.baseUrl || 'http://localhost:11434',
    model: savedSettings.selectedModel || 'llama2',
  }));
  
  const [isConnected, setIsConnected] = useState<boolean>(!!savedSettings.isConnected);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>(savedSettings.models || []);
  const [selectedModel, setSelectedModel] = useState<string>(savedSettings.selectedModel || 'llama2');
  const [baseUrl, setBaseUrl] = useState<string>(savedSettings.baseUrl || 'http://localhost:11434');

  const saveSettings = () => {
    setItem(LOCAL_STORAGE_KEYS.OLLAMA_SETTINGS, {
      isConnected,
      models,
      selectedModel,
      baseUrl,
    });
  };

  const connect = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      setBaseUrl(url);
      ollamaService.setBaseUrl(url);
      
      const connected = await testConnection();
      
      if (connected) {
        setIsConnected(true);
        const modelList = await fetchModels();
        if (modelList.length > 0 && !modelList.includes(selectedModel)) {
          setSelectedModel(modelList[0]);
          ollamaService.setModel(modelList[0]);
        }
      }
      
      saveSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Ollama');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    saveSettings();
  };

  const updateSelectedModel = (model: string) => {
    setSelectedModel(model);
    ollamaService.setModel(model);
    saveSettings();
  };

  const testConnection = async (): Promise<boolean> => {
    try {
      await axios.get(`${baseUrl}/api/version`);
      return true;
    } catch (err) {
      setError('Failed to connect to Ollama. Make sure it\'s running and accessible.');
      return false;
    }
  };

  const fetchModels = async (): Promise<string[]> => {
    try {
      const response = await axios.get(`${baseUrl}/api/tags`);
      const modelList = response.data.models.map((model: any) => model.name);
      setModels(modelList);
      saveSettings();
      return modelList;
    } catch (err) {
      setError('Failed to fetch models from Ollama');
      return [];
    }
  };

  return (
    <OllamaContext.Provider
      value={{
        ollamaService,
        isConnected,
        isLoading,
        error,
        models,
        selectedModel,
        baseUrl,
        connect,
        disconnect,
        setSelectedModel: updateSelectedModel,
        testConnection,
        fetchModels,
      }}
    >
      {children}
    </OllamaContext.Provider>
  );
};
