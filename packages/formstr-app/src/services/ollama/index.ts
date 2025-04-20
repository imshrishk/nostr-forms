import axios from 'axios';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface GenerationOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

class OllamaService {
  private config: OllamaConfig;
  
  constructor(config?: Partial<OllamaConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'http://localhost:11434',
      model: config?.model || 'llama2',
    };
  }

  async generateText(options: GenerationOptions): Promise<string> {
    try {
      const response = await axios.post(`${this.config.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt: options.prompt,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
      });
      
      return response.data.response;
    } catch (error) {
      console.error('Error generating text with Ollama:', error);
      throw error;
    }
  }

  async chat(options: ChatOptions): Promise<string> {
    try {
      const response = await axios.post(`${this.config.baseUrl}/api/chat`, {
        model: this.config.model,
        messages: options.messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
      });
      
      return response.data.message.content;
    } catch (error) {
      console.error('Error chatting with Ollama:', error);
      throw error;
    }
  }

  setModel(model: string): void {
    this.config.model = model;
  }

  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }
}

export const ollamaService = new OllamaService();
export default OllamaService;
