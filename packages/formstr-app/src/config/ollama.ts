interface OllamaConfig {
  baseUrl: string;
  model: string;
  useProxy: boolean;
  proxyUrl: string;
  availableModels: string[];
}

const ollamaConfig: OllamaConfig = {
  baseUrl: process.env.REACT_APP_OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  model: process.env.REACT_APP_OLLAMA_MODEL || 'llama2',
  useProxy: true, // Use proxy by default to avoid CORS issues
  proxyUrl: '/ollama-api',
  availableModels: [
    'llama2',
    'llama3',
    'mistral',
    'gemma',
    'phi',
    'neural-chat',
    'wizard-math',
    'qwen',
    'codegemma',
    'orca-mini',
    'stable-code',
  ],
};

export default ollamaConfig;
