import axios from 'axios';

interface OllamaConfig {
  baseUrl: string;
  model: string;
  useProxy: boolean;
  proxyUrl: string;
}

interface GenerateResponse {
  response: string;
  context?: number[];
}

const FALLBACK_FORM_FIELDS = [
  {
    type: "text",
    label: "Full Name",
    required: true
  },
  {
    type: "email",
    label: "Email Address",
    required: true
  },
  {
    type: "tel",
    label: "Phone Number",
    required: false
  },
  {
    type: "text",
    label: "Company",
    required: false
  },
  {
    type: "textarea",
    label: "Comments",
    required: false
  }
];

class OllamaService {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  private getApiUrl(): string {
    return this.config.useProxy 
      ? `${this.config.proxyUrl}/generate`
      : `${this.config.baseUrl}/api/generate`;
  }

  async generate(prompt: string, context?: number[]): Promise<GenerateResponse> {
    try {
      try {
        const apiUrl = this.getApiUrl();
        console.log(`Connecting to Ollama at: ${apiUrl}`);
        
        const response = await axios.post(apiUrl, {
          model: this.config.model,
          prompt,
          context,
          stream: false,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        });

        return {
          response: response.data.response,
          context: response.data.context,
        };
      } catch (directError) {
        console.warn('Connection to Ollama failed, using fallback mechanism', directError);
        
        const mockResponse = this.generateMockResponse(prompt);
        return {
          response: mockResponse,
        };
      }
    } catch (error) {
      console.error('Error generating response from Ollama:', error);
      throw error;
    }
  }

  private generateMockResponse(prompt: string): string {
    if (prompt.includes('form description')) {
      return JSON.stringify(FALLBACK_FORM_FIELDS);
    } else {
      return JSON.stringify({
        "Full Name": "John Doe",
        "Email Address": "john.doe@example.com",
        "Phone Number": "555-123-4567",
        "Company": "Acme Corp",
        "Comments": "This is a fallback response as the Ollama service is unavailable."
      });
    }
  }

  async generateFormSuggestions(description: string): Promise<string> {
    try {
      const prompt = `Given the following form description, suggest appropriate form fields with their types and labels. Format the response as a JSON array of objects with 'type', 'label', and 'required' properties:

Description: ${description}

Example format:
[
  {
    "type": "text",
    "label": "Full Name",
    "required": true
  }
]

Available field types: text, email, tel, number, date, select, radio, checkbox, textarea.
Ensure your response is valid JSON with no extra text.`;

      const response = await this.generate(prompt);
      try {
        const parsedResponse = JSON.parse(response.response);
        return JSON.stringify(parsedResponse);
      } catch (parseError) {
        console.error('Error parsing AI response, using fallback:', parseError);
        return JSON.stringify(FALLBACK_FORM_FIELDS);
      }
    } catch (err) {
      console.error('Error generating form suggestions, using fallback:', err);
      return JSON.stringify(FALLBACK_FORM_FIELDS);
    }
  }

  async generateFormResponse(formFields: any[], context: string): Promise<Record<string, any>> {
    try {
      const prompt = `Given the following form fields and context, generate appropriate responses:

Form Fields:
${JSON.stringify(formFields, null, 2)}

Context:
${context}

Please provide responses in JSON format matching the field labels as keys. Ensure your response is valid JSON with no extra text.`;

      const response = await this.generate(prompt);
      try {
        return JSON.parse(response.response);
      } catch (error) {
        console.error('Error parsing AI response, generating fallback:', error);
        const fallbackResponse: Record<string, any> = {};
        formFields.forEach(field => {
          if (field.type === 'email') {
            fallbackResponse[field.label] = 'user@example.com';
          } else if (field.type === 'tel') {
            fallbackResponse[field.label] = '555-123-4567';
          } else if (field.type === 'number') {
            fallbackResponse[field.label] = 42;
          } else if (field.type === 'date') {
            fallbackResponse[field.label] = '2023-01-01';
          } else if (field.type === 'textarea') {
            fallbackResponse[field.label] = 'This is a sample response.';
          } else {
            fallbackResponse[field.label] = 'Sample response';
          }
        });
        return fallbackResponse;
      }
    } catch (err) {
      console.error('Error generating form responses, using fallback:', err);
      const fallbackResponse: Record<string, any> = {};
      formFields.forEach(field => {
        fallbackResponse[field.label] = `Sample ${field.label} response`;
      });
      return fallbackResponse;
    }
  }
}

export default OllamaService;
