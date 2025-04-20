// packages/formstr-app/src/services/ollama/index.ts
interface GenerateParams {
    model: string;
    prompt: string;
    stream?: boolean;
    options?: Record<string, any>;
  }
  
  class OllamaService {
    async ping(baseUrl: string): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/api/health`, {
          method: 'GET',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to ping Ollama: ${response.statusText}`);
        }
        
        return true;
      } catch (error) {
        console.error('Ollama ping failed:', error);
        throw error;
      }
    }
  
    async listModels(baseUrl: string): Promise<string[]> {
      try {
        const response = await fetch(`${baseUrl}/api/tags`, {
          method: 'GET',
        });
  
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
  
        const data = await response.json();
        if (!data.models) {
          return [];
        }
        
        return data.models.map((model: any) => model.name);
      } catch (error) {
        console.error('Failed to list Ollama models:', error);
        throw error;
      }
    }
  
    async generate(baseUrl: string, model: string, prompt: string): Promise<string> {
      try {
        const params: GenerateParams = {
          model,
          prompt,
          stream: false,
        };
  
        const response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });
  
        if (!response.ok) {
          throw new Error(`Failed to generate text: ${response.statusText}`);
        }
  
        const data = await response.json();
        return data.response;
      } catch (error) {
        console.error('Text generation failed:', error);
        throw error;
      }
    }
  
    async generateStream(
      baseUrl: string,
      model: string,
      prompt: string,
      onChunk: (text: string) => void
    ): Promise<void> {
      try {
        const params: GenerateParams = {
          model,
          prompt,
          stream: true,
        };
  
        const response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });
  
        if (!response.ok || !response.body) {
          throw new Error(`Failed to generate streaming text: ${response.statusText}`);
        }
  
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
  
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          try {
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              const parsedLine = JSON.parse(line);
              if (parsedLine.response) {
                onChunk(parsedLine.response);
              }
            }
          } catch (e) {
            console.error('Error parsing streaming response:', e);
          }
        }
      } catch (error) {
        console.error('Streaming text generation failed:', error);
        throw error;
      }
    }
  }
  
  export const ollamaService = new OllamaService();
