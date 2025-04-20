interface OllamaConfig {
  baseUrl: string;
  model: string;
  useProxy: boolean;
  proxyUrl: string;
}

const ollamaConfig: OllamaConfig = {
  baseUrl: process.env.REACT_APP_OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.REACT_APP_OLLAMA_MODEL || 'llama2',
  useProxy: true, // Use proxy by default to avoid CORS issues
  proxyUrl: '/ollama-api',
};

export default ollamaConfig;
