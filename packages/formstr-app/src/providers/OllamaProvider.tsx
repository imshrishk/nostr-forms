// packages/formstr-app/src/providers/OllamaProvider.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { ollamaService } from '../services/ollama';
import { getItem, setItem, LOCAL_STORAGE_KEYS } from '../utils/localStorage';

// Update localStorage.ts to include these keys
// packages/formstr-app/src/utils/localStorage.ts
export const LOCAL_STORAGE_KEYS = {
  // ... existing keys
  OLLAMA_BASE_URL: 'ollama_base_url',
  OLLAMA_MODEL: 'ollama_model',
};

interface OllamaContextType {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  model: string;
  setModel: (model: string) => void;
  availableModels: string[];
  fetchModels: (baseUrl?: string) => Promise<void>;
  generateText: (prompt: string) => Promise<string>;
  testConnection: (baseUrl?: string) => Promise<boolean>;
  connectionStatus: 'idle' | 'success' | 'error';
  isLoading: boolean;
  isConfigured: boolean;
}

const defaultContext: OllamaContextType = {
  baseUrl: 'http://localhost:11434',
  setBaseUrl: () => {},
  model: '',
  setModel: () => {},
  availableModels: [],
  fetchModels: async () => {},
  generateText: async () => '',
  testConnection: async () => false,
  connectionStatus: 'idle',
  isLoading: false,
  isConfigured: false,
};

const OllamaContext = createContext<OllamaContextType>(defaultContext);

export const useOllama = () => useContext(OllamaContext);

interface OllamaProviderProps {
  children: ReactNode;
}

export const OllamaProvider: React.FC<OllamaProviderProps> = ({ children }) => {
  const [baseUrl, setBaseUrl] = useState<string>(
    getItem(LOCAL_STORAGE_KEYS.OLLAMA_BASE_URL) || 'http://localhost:11434'
  );
  const [model, setModel] = useState<string>(
    getItem(LOCAL_STORAGE_KEYS.OLLAMA_MODEL) || ''
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);

  const fetchModels = async (url?: string) => {
    const serverUrl = url || baseUrl;
    setIsLoading(true);
    try {
      const models = await ollamaService.listModels(serverUrl);
      setAvailableModels(models);
      if (models.length > 0 && !model) {
        setModel(models[0]);
      }
      return models;
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      message.error('Failed to fetch available models from Ollama');
      setAvailableModels([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (url?: string) => {
    const serverUrl = url || baseUrl;
    setIsLoading(true);
    setConnectionStatus('idle');
    try {
      await ollamaService.ping(serverUrl);
      setConnectionStatus('success');
      return true;
    } catch (error) {
      console.error('Failed to connect to Ollama:', error);
      setConnectionStatus('error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const generateText = async (prompt: string): Promise<string> => {
    if (!baseUrl || !model) {
      message.error('Ollama is not properly configured');
      return '';
    }

    setIsLoading(true);
    try {
      const response = await ollamaService.generate(baseUrl, model, prompt);
      return response;
    } catch (error) {
      console.error('Text generation failed:', error);
      message.error('Failed to generate text with Ollama');
      return '';
    } finally {
      setIsLoading(false);
    }
  };

  // Update local storage when settings change
  useEffect(() => {
    setItem(LOCAL_STORAGE_KEYS.OLLAMA_BASE_URL, baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    setItem(LOCAL_STORAGE_KEYS.OLLAMA_MODEL, model);
  }, [model]);

  // Initial setup
  useEffect(() => {
    if (baseUrl) {
      testConnection();
      fetchModels();
    }
  }, []);

  const isConfigured = !!baseUrl && !!model;

  const value = {
    baseUrl,
    setBaseUrl,
    model,
    setModel,
    availableModels,
    fetchModels,
    generateText,
    testConnection,
    connectionStatus,
    isLoading,
    isConfigured,
  };

  return <OllamaContext.Provider value={value}>{children}</OllamaContext.Provider>;
};
