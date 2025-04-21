import axios, { AxiosResponse } from 'axios';
import { message } from 'antd';

const debugMode = true; // Set to true to enable detailed logging

export type FormTemplateKey = 'contact' | 'event' | 'survey' | 'application' | 'order';

interface FormTemplate {
  prompt: string;
  template: any;
}

interface ApiRequestOptions {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
  };
}

interface OllamaConfig {
  baseUrl: string;
  model: string;
}

// Define field types more explicitly
interface FormField {
  type: string;
  label: string;
  required: boolean;
  options: string[];
}

// Define the structure for special fields
interface SpecialFieldsMap {
  [key: string]: FormField;
}

// Special fields to look for in descriptions
const specialFields: SpecialFieldsMap = {
  'name': { type: 'text', label: 'Name', required: false, options: [] },
  'sex': { type: 'select', label: 'Sex', required: false, options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
  'gender': { type: 'select', label: 'Gender', required: false, options: ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'] },
  'mobile': { type: 'tel', label: 'Mobile No', required: false, options: [] },
  'phone': { type: 'tel', label: 'Phone', required: false, options: [] },
  'mobile no': { type: 'tel', label: 'Mobile No', required: false, options: [] },
  'food': { type: 'select', label: 'Food', required: false, options: ['Vegetarian', 'Non-vegetarian', 'Vegan', 'No preference'] },
  'email': { type: 'email', label: 'Email', required: false, options: [] },
  'address': { type: 'textarea', label: 'Address', required: false, options: [] },
  'age': { type: 'number', label: 'Age', required: false, options: [] },
  'date': { type: 'time', label: 'Date', required: false, options: [] },
  'party form': { type: 'text', label: 'Party Form', required: false, options: [] },
  'place': { type: 'text', label: 'Place', required: false, options: [] },
  'hats': { type: 'checkbox', label: 'Hats', required: false, options: ['Baseball Cap', 'Party Hat', 'Fedora', 'None'] },
  'alcohol': { type: 'select', label: 'Alcohol', required: false, options: ['Beer', 'Wine', 'Spirits', 'None'] },
  'time': { type: 'time', label: 'Time', required: false, options: [] }
};

// Replace FormStr with appropriate form structure type
type FormStr = any;

// Function to generate a template form as fallback
function generateTemplate(): FormStr {
  return {
    name: "Contact Form",
    description: "A simple contact form",
    fields: [
      { type: 'text', label: 'Name', required: true },
      { type: 'email', label: 'Email', required: true },
      { type: 'textarea', label: 'Message', required: true }
    ]
  };
}

// Define interface for test connection result
interface ConnectionTestResult {
  success: boolean;
  message: string;
  availableModels?: string[];
}

class OllamaService {
  private baseUrl: string = '/ollama-api';
  private model: string = 'nostrforms'; // Updated to use nostrforms by default
  private backupEnabled: boolean = false;
  private lastError: Error | null = null;
  private connected: boolean = false;
  private formTemplates: Record<FormTemplateKey, FormTemplate> = {
    contact: {
      prompt: "Create a contact form with fields for name, email address, phone number, subject, and message content. Name, email, and message should be required fields.",
      template: null
    },
    event: {
      prompt: "Create an event registration form with fields for attendee name, email, phone number, organization, job title, dietary restrictions, and session preferences. Name and email should be required.",
      template: null
    },
    survey: {
      prompt: "Create a customer feedback survey with questions for overall satisfaction rating, product quality rating, service experience comments, likelihood to recommend (scale 1-10), and areas for improvement. All rating questions should be required.",
      template: null
    },
    application: {
      prompt: "Create a job application form with fields for full name, email, phone, resume upload, work experience, education background, skills, and references. All fields except references should be required.",
      template: null
    },
    order: {
      prompt: "Create an order form with fields for customer name, contact information, product selection, quantity, shipping address, billing address, and payment method. All fields should be required except for special instructions.",
      template: null
    }
  };

  constructor(config?: OllamaConfig) {
    if (debugMode) console.log('OllamaService initialized');
    if (config) {
      this.baseUrl = config.baseUrl || this.baseUrl;
      this.model = config.model || this.model;
    }
    // Initialize with connection test without enabling backup immediately
    this.testConnection().catch(err => console.error('Initial connection test failed:', err));
  }

  // New method to set configuration - required by OllamaSettings component
  setConfig(config: OllamaConfig): void {
    if (debugMode) console.log(`Setting Ollama config:`, config);
    if (config) {
      this.baseUrl = config.baseUrl || this.baseUrl;
      this.model = config.model || this.model;
    }
    // Don't automatically test connection here to avoid loops
  }

  updateConfig(baseUrl: string, model: string): void {
    if (debugMode) console.log(`Updating Ollama config: baseUrl=${baseUrl}, model=${model}`);
    this.baseUrl = baseUrl || '/ollama-api';
    this.model = model || 'nostrforms';
    // Don't reset backup flag automatically
    this.testConnection();
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      if (debugMode) console.log(`Testing connection to Ollama: ${this.baseUrl}`);
      
      // Skip health check if baseUrl is the default one but in the browser
      // This reduces console errors when Ollama isn't running locally
      let healthCheckPassed = false;
      
      try {
        // Check if we're running in a browser environment and with default URL
        const isBrowser = typeof window !== 'undefined';
        const isDefaultUrl = this.baseUrl === '/ollama-api';
        
        // Only perform health check if we're not using default URL in browser
        // or if explicitly configured
        if (!isBrowser || !isDefaultUrl) {
          const healthCheck = await axios.get(`${this.baseUrl}/api/health`, { 
            timeout: 2000,
            validateStatus: () => true // Accept any status to avoid throwing
          });
          
          healthCheckPassed = healthCheck.status === 200;
          if (healthCheckPassed) {
            console.log('Ollama health check passed');
          } else {
            console.log(`Ollama health check returned status: ${healthCheck.status}`);
          }
        } else {
          // Skip health check for default URL in browser
          console.log('Skipping health check for default URL in browser environment');
        }
      } catch (healthErr) {
        // Silence the health check error to prevent console spam
        console.log('Ollama health check failed silently');
      }
      
      // Proceed with model check even if health check failed
      try {
        const response = await axios.get(`${this.baseUrl}/api/tags`, { 
          timeout: 3000,
          validateStatus: () => true // Accept any status to avoid throwing
        });
        
        if (debugMode) console.log('Model list response:', response.status, response.statusText, response.data);
        
        if (response.status === 200) {
          if (!response.data || !response.data.models) {
            // If API doesn't return the expected structure, try a different endpoint
            try {
              const modelListResponse = await axios.get(`${this.baseUrl}/api/models`, { timeout: 5000 });
              if (modelListResponse.data && Array.isArray(modelListResponse.data)) {
                const modelNames = modelListResponse.data.map((m: any) => m.name || m);
                this.connected = true;
                this.backupEnabled = false;
                this.lastError = null;
                
                return {
                  success: true,
                  message: `Connected to Ollama server with ${modelNames.length} models available.`,
                  availableModels: modelNames
                };
              }
            } catch (err) {
              console.warn('Failed to get models from alternative endpoint', err);
            }
          }
          
          const models = response.data.models || [];
          // Less strict model checking - if we have any models available, consider it connected
          if (models.length > 0) {
            const modelNames = models.map((m: any) => m.name || '').filter(Boolean);
            if (debugMode) console.log(`Ollama server is available with models: ${modelNames.join(', ')}`);
            this.connected = true;
            this.backupEnabled = false;
            this.lastError = null;
            
            return {
              success: true,
              message: `Connected to Ollama server with ${models.length} models available.`,
              availableModels: modelNames
            };
          } else {
            const errorMsg = `No models found on Ollama server`;
            console.error(errorMsg);
            this.lastError = new Error(errorMsg);
            this.connected = false;
            // Don't automatically enable backup
            message.warning(`No models found on Ollama server`);
            
            return {
              success: false,
              message: 'No models found on Ollama server. Please run "ollama pull llama2" to download a model.'
            };
          }
        } else {
          // Try an alternative API endpoint structure
          try {
            const listResponse = await axios.get(`${this.baseUrl}/models`, { timeout: 5000 });
            if (listResponse.status === 200 && listResponse.data) {
              const models = listResponse.data.models || [];
              if (models.length > 0) {
                const modelNames = models.map((m: any) => m.name || m).filter(Boolean);
                this.connected = true;
                this.backupEnabled = false;
                
                return {
                  success: true,
                  message: `Connected to Ollama server with ${modelNames.length} models available (alternative API).`,
                  availableModels: modelNames
                };
              }
            }
          } catch (alternativeErr) {
            console.warn('Alternative API endpoint also failed', alternativeErr);
          }
          
          const errorMsg = `Ollama server returned status ${response.status}`;
          console.error(errorMsg);
          this.lastError = new Error(errorMsg);
          this.connected = false;
          // Don't automatically enable backup
          message.warning('Could not connect to Ollama server');
          
          return {
            success: false,
            message: `Received status ${response.status} from Ollama server. Make sure Ollama is running and accessible.`
          };
        }
      } catch (error) {
        // Handle error gracefully
        console.log('Failed to connect to Ollama service. Will use fallback methods.');
        this.connected = false;
        this.backupEnabled = true;
        
        return {
          success: false,
          message: 'Could not connect to Ollama. Using AI-assisted form generation instead.'
        };
      }
    } catch (outerError) {
      // This should rarely happen since we're handling errors in the inner try blocks
      const errorMsg = outerError instanceof Error ? outerError.message : 'Unknown error';
      console.error('Unexpected error connecting to Ollama:', outerError);
      this.lastError = outerError as Error;
      this.connected = false;
      this.backupEnabled = true;
      
      return {
        success: false,
        message: 'Unexpected error connecting to Ollama. Using AI-assisted form generation instead.'
      };
    }
  }

  async generate(requestPrompt: string): Promise<FormStr> {
    if (debugMode) console.log(`Generating form with Ollama, backupEnabled=${this.backupEnabled}`);
    
    // Only use backup if explicitly enabled by user
    if (this.backupEnabled) {
      console.warn('Using backup template due to Ollama connection issues');
      console.error('Last error:', this.lastError);
      return generateTemplate();
    }

    try {
      // Try to reconnect if not connected
      if (!this.connected) {
        const connectionResult = await this.testConnection();
        if (!connectionResult.success && !this.backupEnabled) {
          throw new Error('Cannot connect to Ollama server');
        }
      }

      if (debugMode) console.log(`Sending request to Ollama model: ${this.model}`);
      if (debugMode) console.log('Request prompt:', requestPrompt);
      
      const apiOptions: ApiRequestOptions = {
        model: this.model,
        prompt: requestPrompt,
        stream: false,
        options: {
          temperature: 0.7,
        },
      };

      // Try with the /api/generate endpoint first (newer Ollama versions)
      try {
        const response: AxiosResponse = await axios.post(
          `${this.baseUrl}/api/generate`,
          apiOptions,
          { timeout: 30000 }
        );
        
        if (debugMode) console.log('Response status:', response.status);
        if (debugMode) console.log('Response data:', JSON.stringify(response.data).substring(0, 500) + '...');
        
        // Extract the actual response content
        const responseStr: string = response.data.response || '';
        
        // Try to extract JSON from the response
        const jsonResult = this.extractJsonFromResponse(responseStr);
        
        if (jsonResult) {
          if (debugMode) console.log('Successfully extracted JSON from response');
          return jsonResult;
        } else {
          console.error('Failed to extract JSON from Ollama response');
          // Show error but don't automatically fall back to template
          message.error('Failed to parse Ollama response as JSON');
          throw new Error('Failed to parse Ollama response');
        }
      } catch (apiError) {
        console.warn('Error with /api/generate endpoint:', apiError);
        
        // Fall back to the older /generate endpoint
        const response: AxiosResponse = await axios.post(
          `${this.baseUrl}/generate`,
          apiOptions,
          { timeout: 30000 }
        );
        
        if (debugMode) console.log('Response status from fallback endpoint:', response.status);
        
        // Extract the actual response content
        const responseStr: string = response.data.response || '';
        
        // Try to extract JSON from the response
        const jsonResult = this.extractJsonFromResponse(responseStr);
        
        if (jsonResult) {
          if (debugMode) console.log('Successfully extracted JSON from response (fallback endpoint)');
          return jsonResult;
        } else {
          console.error('Failed to extract JSON from Ollama response (fallback endpoint)');
          message.error('Failed to parse Ollama response as JSON');
          throw new Error('Failed to parse Ollama response');
        }
      }
    } catch (error) {
      console.error('Error generating form with Ollama:', error);
      this.lastError = error as Error;
      message.error('Error communicating with Ollama server');
      throw error;
    }
  }

  async generateFormSuggestions(description: string): Promise<string> {
    if (debugMode) console.log(`Generating form suggestions for: ${description}`);
    
    // Only use backup if explicitly enabled by user
    if (this.backupEnabled) {
      console.warn('Using backup template due to Ollama connection issues');
      console.error('Last error:', this.lastError);
      
      // Extract fields from the description instead of using a fixed template
      return this.extractFieldsFromDescription(description);
    }

    try {
      // Try to reconnect if not connected
      if (!this.connected) {
        const connectionResult = await this.testConnection();
        if (!connectionResult.success && !this.backupEnabled) {
          throw new Error('Cannot connect to Ollama server');
        }
      }

      if (debugMode) console.log(`Sending form suggestion request to Ollama model: ${this.model}`);
      
      // Enhanced prompt with better examples and clarification about field extraction
      const prompt = `
You are a form creation assistant that extracts form fields from descriptions. Your task is to identify ALL field names mentioned in this description, regardless of how unusual they might seem.

Description:
"${description}"

Create a JSON array of form field objects with these properties:
- type: choose the most appropriate from [text, email, tel, number, textarea, select, radio, checkbox, date, time]
- label: the EXACT field name as mentioned in the description
- required: if explicitly mentioned as required, set to true, otherwise false
- options: array of strings (only for select, radio, checkbox types)

IMPORTANT RULES:
1. Extract EVERY field mentioned in the description, including unusual ones
2. Use the EXACT words from the description as field labels
3. Do not add any fields not mentioned in the description
4. Infer the most appropriate field type but default to text if unclear
5. For fields that could be selections (like food, drinks, categories), use select or checkbox type with appropriate options
6. For time-related fields use time or date type
7. For fields that may need more text, use textarea

Return ONLY a valid JSON array with no additional explanation. Example format:

[
  {
    "type": "text",
    "label": "Place",
    "required": false
  },
  {
    "type": "checkbox",
    "label": "Hats",
    "required": false,
    "options": ["Baseball Cap", "Party Hat", "Fedora", "None"]
  },
  {
    "type": "select",
    "label": "Alcohol",
    "required": false,
    "options": ["Beer", "Wine", "Spirits", "None"]
  },
  {
    "type": "time",
    "label": "Time",
    "required": false
  }
]
`;
      
      const apiOptions: ApiRequestOptions = {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more deterministic outputs
        },
      };

      let responseStr = '';
      let attempts = 0;
      const maxAttempts = 2;
      
      // Try multiple attempts with different endpoints if needed
      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          // Try with the /api/generate endpoint first (newer Ollama versions)
          try {
            const response: AxiosResponse = await axios.post(
              `${this.baseUrl}/api/generate`,
              apiOptions,
              { timeout: 45000 } // Extended timeout for complex generations
            );
            
            if (debugMode) console.log('Response status:', response.status);
            
            // Extract the actual response content
            responseStr = response.data.response || '';
            if (responseStr) break;
          } catch (apiError) {
            console.warn('Error with /api/generate endpoint, trying fallback:', apiError);
            
            // Fall back to the older /generate endpoint
            const response: AxiosResponse = await axios.post(
              `${this.baseUrl}/generate`,
              apiOptions,
              { timeout: 45000 }
            );
            
            if (debugMode) console.log('Response status from fallback endpoint:', response.status);
            
            // Extract the actual response content
            responseStr = response.data.response || '';
            if (responseStr) break;
          }
        } catch (attemptError) {
          console.warn(`Attempt ${attempts} failed:`, attemptError);
          // Try again with a slightly modified prompt if there are more attempts left
          if (attempts < maxAttempts) {
            apiOptions.prompt += "\n\nReturn ONLY a valid JSON array and nothing else.";
          }
        }
      }
      
      if (debugMode && responseStr) {
        console.log('Raw response from Ollama:', responseStr.substring(0, 500) + '...');
      }
      
      // Try to extract JSON from the response
      const jsonStr = this.extractStringFromResponse(responseStr);
      
      if (jsonStr) {
        if (debugMode) console.log('Successfully extracted form field JSON');
        
        // Validate the extracted JSON and ensure it has the expected field structure
        try {
          const parsedFields = JSON.parse(jsonStr);
          
          if (Array.isArray(parsedFields) && parsedFields.length > 0) {
            // Ensure each field has the required properties
            const validatedFields = parsedFields.map(field => ({
              type: field.type || 'text',
              label: field.label || 'Untitled Field',
              required: typeof field.required === 'boolean' ? field.required : false,
              options: Array.isArray(field.options) ? field.options : []
            }));
            
            if (debugMode) console.log('Validated fields:', validatedFields);
            return JSON.stringify(validatedFields);
          }
        } catch (parseError) {
          console.error('Error validating extracted JSON:', parseError);
        }
      }
      
      // If extraction failed, manually extract fields from the description
      return this.extractFieldsFromDescription(description);
      
    } catch (error) {
      console.error('Error generating form suggestions with Ollama:', error);
      
      // Don't set backupEnabled by default
      this.lastError = error as Error;
      
      // Fall back to manual field extraction
      return this.extractFieldsFromDescription(description);
    }
  }
  
  // Modify the extractFieldsFromDescription method to be more intelligent when not using AI
  private extractFieldsFromDescription(description: string): string {
    console.log('Extracting fields directly from description using enhanced algorithm');
    
    const fields: FormField[] = [];
    const words = description.split(/[\s,\.;:]+/);
    const lowercaseDesc = description.toLowerCase();
    
    // Set of words to ignore when looking for potential field names
    const ignoreWords = new Set([
      'form', 'with', 'and', 'the', 'for', 'a', 'an', 'in', 'on', 'at', 'to', 'of', 'are', 'is', 
      'required', 'optional', 'fields', 'field', 'as', 'have', 'has', 'too', 'also', 'i', 'we', 
      'you', 'they', 'them', 'but', 'or', 'by', 'can', 'be', 'should', 'would', 'could', 'will', 
      'may', 'might', 'must', 'shall', 'not', 'about', 'which', 'that', 'their', 'there', 'this',
      'these', 'those', 'from', 'your', 'our', 'my', 'his', 'her', 'its'
    ]);
    
    // Common time-related words
    const timeWords = ['time', 'date', 'when', 'schedule', 'appointment', 'hour', 'day', 'start', 'end',
      'calendar', 'datetime', 'duration', 'period', 'deadline', 'birth'];
    
    // Common selection-related words 
    const selectionWords = ['type', 'category', 'option', 'choice', 'select', 'preference', 'food', 
      'drink', 'alcohol', 'beverage', 'menu', 'item', 'product', 'service', 'feature', 'role',
      'color', 'size', 'gender', 'level', 'tier', 'group', 'country', 'state', 'plan'];
    
    // Common multi-line text words
    const textareaWords = ['message', 'comment', 'feedback', 'description', 'details', 'notes', 
      'information', 'summary', 'explanation', 'bio', 'about', 'story', 'experience', 'cover',
      'letter', 'paragraph', 'essay', 'content', 'review', 'suggestion'];
    
    // Common number-related words
    const numberWords = ['number', 'quantity', 'amount', 'count', 'total', 'people', 'guests', 
      'attendees', 'participants', 'tickets', 'age', 'price', 'cost', 'fee', 'years', 'months',
      'days', 'hours', 'weight', 'height', 'length', 'width', 'salary', 'income', 'budget', 'mobile'];
    
    // Common email words
    const emailWords = ['email', 'e-mail', 'mail', 'gmail', 'contact'];
    
    // Common phone words
    const phoneWords = ['phone', 'mobile', 'cell', 'telephone', 'contact', 'whatsapp', 'signal'];

    // Common identifier words
    const identifierWords = ['id', 'identifier', 'code', 'pin', 'username', 'handle', 'account', 'name', 'sex', 'gender'];
    
    // Extract form title and description from the input
    let formTitle = "";
    let formDescription = "";
    
    // Try to extract form title from common patterns
    const titlePatterns = [
      /form(?:\s+for|\s+about)?\s+([\w\s]+?)(?:\s+with|\s+that|\s+having|\s+to|\s+which|\.|$)/i,
      /([\w\s]+?)(?:\s+form)(?:\s+with|\s+that|\s+having|\s+to|\s+which|\.|$)/i,
      /create\s+(?:a|an)\s+([\w\s]+?)(?:\s+form|\s+survey|\s+questionnaire)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = description.match(pattern);
      if (match && match[1] && match[1].length > 3 && match[1].length < 50) {
        formTitle = match[1].trim();
        formTitle = formTitle.charAt(0).toUpperCase() + formTitle.slice(1);
        break;
      }
    }
    
    // If no title found, create one from the first few words
    if (!formTitle) {
      const words = description.split(/\s+/);
      if (words.length >= 2) {
        formTitle = words.slice(0, Math.min(4, words.length)).join(' ');
        formTitle = formTitle.charAt(0).toUpperCase() + formTitle.slice(1);
        if (!formTitle.toLowerCase().includes('form')) {
          formTitle += ' Form';
        }
      } else {
        formTitle = "Custom Form";
      }
    }
    
    // Extract description - use first sentence or portion of input
    if (description.length > 20) {
      const firstSentenceMatch = description.match(/^([^.!?]+[.!?])/);
      if (firstSentenceMatch) {
        formDescription = firstSentenceMatch[0].trim();
      } else {
        formDescription = description.substring(0, Math.min(100, description.length)) + 
          (description.length > 100 ? '...' : '');
      }
    } else {
      formDescription = "Form created from description";
    }
    
    // Check for required fields mentioned in the description
    const requiredFieldsPattern = /required\s+fields?\s+(?:is|are|include[s]?)\s+([\w\s,]+)/i;
    const requiredFieldsMatch = description.match(requiredFieldsPattern);
    const requiredFields = new Set<string>();
    
    if (requiredFieldsMatch && requiredFieldsMatch[1]) {
      const requiredFieldsList = requiredFieldsMatch[1].split(/[\s,]+/).map(f => f.trim().toLowerCase());
      for (const field of requiredFieldsList) {
        if (field && field !== 'and' && field !== 'or' && field !== 'no' && field.length > 1) {
          requiredFields.add(field);
        }
      }
    }

    console.log('Detected required fields:', Array.from(requiredFields));
    
    // First directly extract any special fields mentioned in the description
    for (const [key, fieldDef] of Object.entries(specialFields)) {
      if (lowercaseDesc.includes(key.toLowerCase())) {
        // Check if this field is mentioned as required
        const isRequired = requiredFields.has(key.toLowerCase()) || 
                          (lowercaseDesc.includes(`${key} required`) || 
                           lowercaseDesc.includes(`required ${key}`));
        
        this.addFieldIfNotExists(fields, {
          ...fieldDef,
          required: isRequired
        });
      }
    }
    
    // Strategy 1: Extract field names from sentences in the format "field for X" or "X field"
    const fieldPatterns = [
      /field(?:\s+for)?\s+([\w\s]+?)(?:\s+to|\s+with|\s+that|\s+and|\s+of|\.|$)/gi,
      /([\w\s]+?)(?:\s+field)(?:\s+with|\s+that|\s+for|\s+to|\s+and|\s+of|\.|$)/gi,
    ];
    
    for (const pattern of fieldPatterns) {
      const matches = [...description.matchAll(pattern)];
      for (const match of matches) {
        const fieldName = match[1]?.trim();
        if (fieldName && !ignoreWords.has(fieldName.toLowerCase()) && fieldName.length > 1) {
          // Determine field type based on field name
          let fieldType = 'text'; // Default
          let options: string[] = [];
          let isRequired = requiredFields.has(fieldName.toLowerCase()) || 
                        (lowercaseDesc.includes('required') && 
                         lowercaseDesc.includes(fieldName.toLowerCase()));
          
          if (timeWords.some(tw => fieldName.toLowerCase().includes(tw))) {
            fieldType = 'time';
          } else if (selectionWords.some(sw => fieldName.toLowerCase().includes(sw))) {
            // Improved type selection based on description hints
            if (lowercaseDesc.includes('multiple') || lowercaseDesc.includes('check all')) {
              fieldType = 'checkbox';
            } else if (lowercaseDesc.includes('one choice') || lowercaseDesc.includes('single option')) {
              fieldType = 'radio';
            } else {
              fieldType = 'select'; // Default selection type
            }
            options = this.generateOptionsForField(fieldName);
          } else if (textareaWords.some(tw => fieldName.toLowerCase().includes(tw))) {
            fieldType = 'textarea';
          } else if (numberWords.some(nw => fieldName.toLowerCase().includes(nw))) {
            fieldType = 'number';
          } else if (emailWords.some(ew => fieldName.toLowerCase().includes(ew))) {
            fieldType = 'email';
          } else if (phoneWords.some(pw => fieldName.toLowerCase().includes(pw))) {
            fieldType = 'tel';
          } else if (identifierWords.some(id => fieldName.toLowerCase().includes(id))) {
            fieldType = 'text';
          }
          
          this.addFieldIfNotExists(fields, {
            type: fieldType,
            label: this.capitalizeField(fieldName),
            required: isRequired,
            options: options
          });
        }
      }
    }
    
    // Strategy 2: Look for lists using commas or "and"
    const listRegex = /(?:with|including|having|contains|for|use)\s+((?:[\w\s]+(?:,\s*|,?\s+and\s+))+[\w\s]+)/gi;
    const listMatches = [...description.matchAll(listRegex)];
    
    for (const match of listMatches) {
      if (match[1]) {
        // Split by commas or "and"
        const listItems = match[1].split(/,\s*|\s+and\s+/);
        
        for (const item of listItems) {
          const cleanItem = item.trim();
          if (cleanItem.length > 1 && !ignoreWords.has(cleanItem.toLowerCase())) {
            // Check if it's already in special fields or previously added
            if (specialFields[cleanItem.toLowerCase()]) {
              const isRequired = requiredFields.has(cleanItem.toLowerCase());
              this.addFieldIfNotExists(fields, {
                ...specialFields[cleanItem.toLowerCase()],
                required: isRequired
              });
            } else {
              // Determine field type based on item name
              let fieldType = 'text'; // Default
              let options: string[] = [];
              let isRequired = requiredFields.has(cleanItem.toLowerCase());
              
              if (timeWords.some(tw => cleanItem.toLowerCase().includes(tw))) {
                fieldType = 'time';
              } else if (selectionWords.some(sw => cleanItem.toLowerCase().includes(sw))) {
                // Improved type selection based on description hints
                if (lowercaseDesc.includes('multiple') || lowercaseDesc.includes('check all')) {
                  fieldType = 'checkbox';
                } else if (lowercaseDesc.includes('one choice') || lowercaseDesc.includes('single option')) {
                  fieldType = 'radio';
                } else {
                  fieldType = 'select'; // Default selection type
                }
                options = this.generateOptionsForField(cleanItem);
              } else if (textareaWords.some(tw => cleanItem.toLowerCase().includes(tw))) {
                fieldType = 'textarea';
              } else if (numberWords.some(nw => cleanItem.toLowerCase().includes(nw))) {
                fieldType = 'number';
              } else if (emailWords.some(ew => cleanItem.toLowerCase().includes(ew))) {
                fieldType = 'email';
              } else if (phoneWords.some(pw => cleanItem.toLowerCase().includes(pw))) {
                fieldType = 'tel';
              }
              
              this.addFieldIfNotExists(fields, {
                type: fieldType,
                label: this.capitalizeField(cleanItem),
                required: isRequired,
                options: options
              });
            }
          }
        }
      }
    }
    
    // Strategy 3: Check for required fields that haven't been added yet
    for (const requiredField of requiredFields) {
      const fieldExists = fields.some(f => f.label.toLowerCase() === requiredField || 
                                        f.label.toLowerCase().includes(requiredField));
      
      if (!fieldExists) {
        // Check if it's a special field
        if (specialFields[requiredField]) {
          this.addFieldIfNotExists(fields, {
            ...specialFields[requiredField],
            required: true
          });
        } else {
          // Make an educated guess about the field type
          let fieldType = 'text'; // Default
          let options: string[] = [];
          
          if (requiredField.includes('sex') || requiredField.includes('gender')) {
            fieldType = 'select';
            options = ['Male', 'Female', 'Other', 'Prefer not to say'];
          } else if (timeWords.some(tw => requiredField.includes(tw))) {
            fieldType = 'time';
          } else if (selectionWords.some(sw => requiredField.includes(sw))) {
            // Improved type selection based on description hints
            if (lowercaseDesc.includes('multiple') || lowercaseDesc.includes('check all')) {
              fieldType = 'checkbox';
            } else if (lowercaseDesc.includes('one choice') || lowercaseDesc.includes('single option')) {
              fieldType = 'radio';
            } else {
              fieldType = 'select'; // Default selection type
            }
            options = this.generateOptionsForField(requiredField);
          } else if (textareaWords.some(tw => requiredField.includes(tw))) {
            fieldType = 'textarea';
          } else if (numberWords.some(nw => requiredField.includes(nw))) {
            fieldType = 'number';
          } else if (emailWords.some(ew => requiredField.includes(ew))) {
            fieldType = 'email';
          } else if (phoneWords.some(pw => requiredField.includes(pw))) {
            fieldType = 'tel';
          }
          
          this.addFieldIfNotExists(fields, {
            type: fieldType,
            label: this.capitalizeField(requiredField),
            required: true,
            options: options
          });
        }
      } else {
        // Mark the existing field as required
        for (const field of fields) {
          if (field.label.toLowerCase() === requiredField || 
              field.label.toLowerCase().includes(requiredField)) {
            field.required = true;
          }
        }
      }
    }

    // If "mobile no" is required but not found, add it
    if (requiredFields.has('mobile') || requiredFields.has('mobile no')) {
      const hasMobileField = fields.some(f => 
        f.label.toLowerCase() === 'mobile' || 
        f.label.toLowerCase() === 'mobile no' ||
        f.label.toLowerCase().includes('mobile') ||
        f.label.toLowerCase().includes('phone')
      );
      
      if (!hasMobileField) {
        this.addFieldIfNotExists(fields, {
          type: 'tel',
          label: 'Mobile No',
          required: true,
          options: []
        });
      }
    }
    
    // If we still haven't found any fields, provide a more intelligent default set
    if (fields.length === 0) {
      if (lowercaseDesc.includes('contact')) {
        fields.push(
          { type: 'text', label: 'Name', required: true, options: [] },
          { type: 'email', label: 'Email', required: true, options: [] },
          { type: 'tel', label: 'Phone', required: false, options: [] },
          { type: 'textarea', label: 'Message', required: false, options: [] }
        );
      } else if (lowercaseDesc.includes('event') || lowercaseDesc.includes('party')) {
        fields.push(
          { type: 'text', label: 'Name', required: true, options: [] },
          { type: 'email', label: 'Email', required: true, options: [] },
          { type: 'time', label: 'Date and Time', required: true, options: [] },
          { type: 'select', label: 'Attendance', required: true, options: ['Yes', 'No', 'Maybe'] }
        );
      } else if (lowercaseDesc.includes('survey')) {
        fields.push(
          { type: 'text', label: 'Name', required: false, options: [] },
          { type: 'email', label: 'Email', required: false, options: [] },
          { type: 'select', label: 'Rating', required: true, options: ['Excellent', 'Good', 'Average', 'Poor'] },
          { type: 'textarea', label: 'Feedback', required: true, options: [] }
        );
      } else {
        fields.push(
          { type: 'text', label: 'Name', required: true, options: [] },
          { type: 'email', label: 'Email', required: true, options: [] }
        );
      }
    }
    
    // Add form metadata
    const formData = {
      title: formTitle,
      description: formDescription,
      fields: fields
    };
    
    // Convert to expected format
    const jsonOutput = JSON.stringify(fields, null, 2);
    console.log('Extracted fields with enhanced algorithm:', jsonOutput);
    return jsonOutput;
  }

  // Helper function to avoid duplicate fields
  private addFieldIfNotExists(fields: FormField[], field: FormField): void {
    if (!fields.some(f => f.label.toLowerCase() === field.label.toLowerCase())) {
      fields.push(field);
    }
  }

  // Helper function to properly capitalize field names
  private capitalizeField(fieldName: string): string {
    return fieldName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Helper function to generate options based on field name
  private generateOptionsForField(fieldName: string): string[] {
    const lowercaseName = fieldName.toLowerCase();
    
    if (lowercaseName.includes('country')) {
      return ['United States', 'Canada', 'United Kingdom', 'Australia', 'Other'];
    } else if (lowercaseName.includes('gender')) {
      return ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
    } else if (lowercaseName.includes('age') || lowercaseName.includes('group')) {
      return ['Under 18', '18-24', '25-34', '35-44', '45-54', '55+'];
    } else if (lowercaseName.includes('education')) {
      return ['High School', 'Associate Degree', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate'];
    } else if (lowercaseName.includes('income')) {
      return ['$0-$25,000', '$25,001-$50,000', '$50,001-$75,000', '$75,001-$100,000', '$100,001+'];
    } else if (lowercaseName.includes('satisfaction') || lowercaseName.includes('rating')) {
      return ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'];
    } else if (lowercaseName.includes('priority') || lowercaseName.includes('importance')) {
      return ['High', 'Medium', 'Low', 'Not Important'];
    } else if (lowercaseName.includes('experience')) {
      return ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    } else if (lowercaseName.includes('frequency')) {
      return ['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never'];
    } else if (lowercaseName.includes('service')) {
      return ['Basic', 'Standard', 'Premium', 'Enterprise'];
    } else if (lowercaseName.includes('food') || lowercaseName.includes('meal') || lowercaseName.includes('diet')) {
      return ['Vegetarian', 'Vegan', 'Gluten-Free', 'No Restrictions', 'Other'];
    } else if (lowercaseName.includes('alcohol')) {
      return ['Beer', 'Wine', 'Spirits', 'Non-alcoholic', 'None'];
    } else if (lowercaseName.includes('yes') || lowercaseName.includes('no') || lowercaseName.includes('confirm')) {
      return ['Yes', 'No', 'Maybe'];
    } else {
      return ['Option 1', 'Option 2', 'Option 3'];
    }
  }

  private extractJsonFromResponse(text: string): FormStr | null {
    if (!text) return null;
    
    try {
      // First try direct parsing - maybe it's already valid JSON
      try {
        return JSON.parse(text);
      } catch (e) {
        // Continue to more sophisticated extraction
      }
      
      // Try to find JSON object using regex
      const jsonRegex = /{[\s\S]*?}/g;
      const jsonMatches = text.match(jsonRegex);
      
      if (jsonMatches && jsonMatches.length > 0) {
        // Try each match until we find valid JSON
        for (const match of jsonMatches) {
          try {
            return JSON.parse(match);
          } catch (e) {
            // Try next match
          }
        }
      }
      
      // Try finding with code block markers
      const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
      const codeBlockMatches = codeBlockRegex.exec(text);
      
      if (codeBlockMatches && codeBlockMatches[1]) {
        try {
          return JSON.parse(codeBlockMatches[1]);
        } catch (e) {
          // Try other methods
        }
      }
      
      // Final fallback: aggressive cleaning to try to get valid JSON
      const potentialJson = text
        .replace(/```json\s+/g, '')
        .replace(/```/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();
        
      try {
        return JSON.parse(potentialJson);
      } catch (e) {
        console.error('All JSON parsing attempts failed:', e);
        return null;
      }
    } catch (e) {
      console.error('Error in JSON extraction:', e);
      return null;
    }
  }

  private extractStringFromResponse(text: string): string | null {
    if (debugMode) console.log('Extracting form field JSON from response...');
    
    if (!text || typeof text !== 'string') {
      console.error('Invalid text provided to extractStringFromResponse');
      return null;
    }
    
    try {
      // First attempt: try to parse the entire response as JSON
      try {
        // Test if the response is valid JSON
        JSON.parse(text);
        if (debugMode) console.log('Direct JSON parsing successful');
        return text;
      } catch (e) {
        if (debugMode) console.log('Direct JSON parsing failed, trying to extract JSON from text');
      }

      // Second attempt: try to find JSON within triple backticks
      const jsonPattern = /```(?:json)?\s*([\s\S]*?)\s*```/;
      const match = text.match(jsonPattern);
      
      if (match && match[1]) {
        if (debugMode) console.log('Found JSON within backticks');
        const jsonStr = match[1].trim();
        try {
          // Validate it's valid JSON
          JSON.parse(jsonStr);
          return jsonStr;
        } catch (e) {
          console.warn('JSON in backticks is not valid, continuing with other methods');
        }
      }

      // Third attempt: find any array-like structure in the text
      // First try to match a complete array with objects
      const completeArrayPattern = /\[\s*\{\s*"[^"]+"\s*:[\s\S]*?\}\s*\]/g;
      const completeMatches = text.match(completeArrayPattern);
      
      if (completeMatches && completeMatches.length > 0) {
        for (const potentialJson of completeMatches) {
          try {
            const parsed = JSON.parse(potentialJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (debugMode) console.log('Found complete array structure in text');
              return potentialJson;
            }
          } catch (e) {
            // Continue to the next match
          }
        }
      }
      
      // Fourth attempt: less strict array pattern
      const possibleArrayPattern = /\[\s*\{[\s\S]*?\}\s*\]/g;
      const arrayMatch = text.match(possibleArrayPattern);
      
      if (arrayMatch && arrayMatch.length > 0) {
        for (const potentialJson of arrayMatch) {
          try {
            const parsed = JSON.parse(potentialJson);
            if (Array.isArray(parsed)) {
              if (debugMode) console.log('Found possible array structure in text');
              return potentialJson;
            }
          } catch (e) {
            // Continue to the next match
          }
        }
      }
      
      // Fifth attempt: try to find JSON objects and wrap them in an array
      const objectPattern = /\{\s*"type"\s*:\s*"[^"]+"\s*,[\s\S]*?"required"\s*:\s*(true|false)[\s\S]*?\}/g;
      const objectMatches = text.match(objectPattern);
      
      if (objectMatches && objectMatches.length > 0) {
        try {
          // Combine objects into an array
          const combinedJson = `[${objectMatches.join(',')}]`;
          // Test if valid
          JSON.parse(combinedJson);
          if (debugMode) console.log('Combined individual objects into an array');
          return combinedJson;
        } catch (e) {
          console.warn('Failed to combine objects into valid JSON array');
        }
      }

      // If we got here, no valid JSON was found
      console.error('No valid JSON found in response');
      return null;
    } catch (error) {
      console.error('Error extracting form fields JSON from response:', error);
      return null;
    }
  }

  // Method to generate AI responses for form fields
  async generateFormResponse(fields: any[], context: string): Promise<Record<string, any>> {
    if (debugMode) console.log(`Generating form responses with context: ${context}`);
    
    if (this.backupEnabled) {
      console.warn('Using sample responses due to Ollama connection issues');
      return this.generateSampleResponses(fields);
    }

    try {
      // Try to reconnect if not connected
      if (!this.connected) {
        const connectionResult = await this.testConnection();
        if (!connectionResult.success && !this.backupEnabled) {
          throw new Error('Cannot connect to Ollama server');
        }
      }
      
      // Ensure fields array is properly formatted
      if (!Array.isArray(fields) || fields.length === 0) {
        console.warn('Invalid fields array, using fallback');
        return this.generateSampleResponses(fields || []);
      }
      
      // Create a map to track field IDs by their labels for later mapping
      const fieldIdMap: Record<string, string> = {};
      
      // Generate more detailed field descriptions to help the AI
      const fieldDescriptions = fields.map(field => {
        if (!field || typeof field !== 'object') return '';
        
        const id = field.id || '';
        const label = field.label || 'Unnamed field';
        const type = field.type || 'text';
        const required = field.required ? ' (required)' : '';
        
        // Store mapping of label to id
        fieldIdMap[label] = id;
        
        // Format options if available
        let optionsText = '';
        if (field.options && Array.isArray(field.options) && field.options.length > 0) {
          optionsText = ` - Options: [${field.options.join(', ')}]`;
        }
        
        // Add semantic information if available
        let semanticsText = '';
        if (field.semantics && typeof field.semantics === 'object') {
          const semanticTypes = Object.entries(field.semantics)
            .filter(([, value]) => value === true)
            .map(([key]) => key.replace('is', ''));
            
          if (semanticTypes.length > 0) {
            semanticsText = ` - Semantic type: ${semanticTypes.join(', ')}`;
          }
        }
        
        return `${label} (${type})${required}${optionsText}${semanticsText}`;
      }).filter(desc => desc).join('\n');
      
      // Create improved prompt with better structure and examples
      const prompt = `
You are a form-filling assistant that provides realistic, context-appropriate responses.

CONTEXT INFORMATION:
${context}

FORM FIELDS TO FILL:
${fieldDescriptions}

INSTRUCTIONS:
1. Generate realistic responses for each field based on the context provided
2. For select/checkbox fields, only use options from the provided list
3. Format dates as "YYYY-MM-DD" and times as "HH:MM AM/PM"
4. Extract specific information from the context when available
5. Be concise and relevant in your responses

Return ONLY a JSON object where keys are the field labels and values are your responses:
{
  "Field Label 1": "Your response for field 1",
  "Field Label 2": "Your response for field 2"
}

Do not include any explanations, only return the JSON object.
`;
      
      const apiOptions: ApiRequestOptions = {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
        },
      };

      let responseStr = '';
      
      try {
        const response = await axios.post(`${this.baseUrl}/generate`, apiOptions);
        responseStr = response.data.response || '';
      } catch (error) {
        console.error('Error calling Ollama API:', error);
        throw new Error('Failed to generate response from Ollama');
      }
      
      // Extract JSON from response with improved error handling
      const jsonResponse = this.extractJsonFromResponse(responseStr);
      
      if (!jsonResponse || typeof jsonResponse !== 'object') {
        console.warn('Failed to extract valid JSON from AI response, using fallback');
        return this.generateSampleResponses(fields);
      }
      
      // Map responses to field IDs instead of labels for more reliable handling
      const idBasedResponses: Record<string, [string, string | undefined]> = {};
      
      // Process responses to match the expected format with id-based mapping
      Object.entries(jsonResponse).forEach(([label, value]) => {
        const fieldId = fieldIdMap[label];
        if (fieldId) {
          // Format: [answer, message]
          // The message can be undefined as it's optional context
          idBasedResponses[fieldId] = [String(value), undefined];
        }
      });
      
      // Use fallbacks for any fields that didn't get responses
      const coveredLabels = Object.keys(jsonResponse);
      const missingFields = fields.filter(field => 
        field.label && !coveredLabels.includes(field.label)
      );
      
      if (missingFields.length > 0) {
        console.warn(`Missing responses for ${missingFields.length} fields, using fallbacks`);
        const fallbacks = this.generateSampleResponses(missingFields);
        
        // Add fallbacks for missing fields
        Object.entries(fallbacks).forEach(([label, value]) => {
          const fieldId = fieldIdMap[label];
          if (fieldId && !idBasedResponses[fieldId]) {
            idBasedResponses[fieldId] = [String(value), undefined];
          }
        });
      }
      
      return idBasedResponses;
    } catch (error) {
      console.error('Error generating form responses:', error);
      return this.generateSampleResponses(fields);
    }
  }

  // Generate sample responses as fallback
  private generateSampleResponses(fields: any[]): Record<string, any> {
    const responses: Record<string, any> = {};
    
    // Add more intelligent sample data
    const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Emma'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const domains = ['example.com', 'company.com', 'mail.com', 'business.org', 'service.net'];
    const companies = ['Acme Inc', 'TechCorp', 'GlobalSoft', 'Innovate Systems', 'Prime Solutions'];
    const streets = ['Main St', 'Oak Avenue', 'Park Road', 'Elm Street', 'Washington Blvd'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
    const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
    
    const randomItem = (array: string[]) => array[Math.floor(Math.random() * array.length)];
    
    fields.forEach(field => {
      const label = field.label;
      const lowerLabel = label.toLowerCase();
      
      switch (field.type) {
        case 'text':
          if (lowerLabel.includes('name') && lowerLabel.includes('first')) {
            responses[label] = randomItem(firstNames);
          } else if (lowerLabel.includes('name') && lowerLabel.includes('last')) {
            responses[label] = randomItem(lastNames);
          } else if (lowerLabel.includes('full') && lowerLabel.includes('name')) {
            responses[label] = `${randomItem(firstNames)} ${randomItem(lastNames)}`;
          } else if (lowerLabel.includes('name')) {
            responses[label] = `${randomItem(firstNames)} ${randomItem(lastNames)}`;
          } else if (lowerLabel.includes('company') || lowerLabel.includes('organization')) {
            responses[label] = randomItem(companies);
          } else if (lowerLabel.includes('address') || lowerLabel.includes('street')) {
            const num = Math.floor(Math.random() * 1000) + 1;
            responses[label] = `${num} ${randomItem(streets)}`;
          } else if (lowerLabel.includes('city')) {
            responses[label] = randomItem(cities);
          } else if (lowerLabel.includes('state')) {
            responses[label] = randomItem(states);
          } else if (lowerLabel.includes('zip') || lowerLabel.includes('postal')) {
            responses[label] = `${Math.floor(Math.random() * 90000) + 10000}`;
          } else if (lowerLabel.includes('subject')) {
            responses[label] = 'General inquiry about your services';
          } else if (lowerLabel.includes('title') || lowerLabel.includes('position')) {
            responses[label] = randomItem(['Manager', 'Director', 'Developer', 'Analyst', 'Coordinator']);
          } else {
            responses[label] = 'Sample Text';
          }
          break;
        
        case 'email':
          const firstName = randomItem(firstNames).toLowerCase();
          const lastName = randomItem(lastNames).toLowerCase();
          responses[label] = `${firstName}.${lastName}@${randomItem(domains)}`;
          break;
        
        case 'tel':
          responses[label] = `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
          break;
        
        case 'number':
          if (lowerLabel.includes('age')) {
            responses[label] = Math.floor(Math.random() * 50) + 18;
          } else if (lowerLabel.includes('year')) {
            responses[label] = Math.floor(Math.random() * 10) + 2015;
          } else if (lowerLabel.includes('quantity') || lowerLabel.includes('amount')) {
            responses[label] = Math.floor(Math.random() * 10) + 1;
          } else if (lowerLabel.includes('price') || lowerLabel.includes('cost')) {
            responses[label] = Math.floor(Math.random() * 100) + 10;
          } else {
            responses[label] = Math.floor(Math.random() * 100);
          }
          break;
        
        case 'textarea':
        case 'textbox':
          if (lowerLabel.includes('message')) {
            responses[label] = 'I would like to learn more about your products and services. Please send me additional information when convenient.';
          } else if (lowerLabel.includes('feedback')) {
            responses[label] = 'My experience was very positive. The service was prompt and professional. I would recommend to others.';
          } else if (lowerLabel.includes('comment')) {
            responses[label] = 'Great product! I especially liked the user-friendly interface and the responsive customer support.';
          } else if (lowerLabel.includes('bio') || lowerLabel.includes('about')) {
            responses[label] = 'Experienced professional with over 10 years in the industry. Specializing in project management, team leadership, and strategic planning.';
          } else {
            responses[label] = 'This is a sample response for a text area field. It provides more detailed information than a standard text field would contain.';
          }
          break;
        
        case 'date':
        case 'time':
          const today = new Date();
          const futureDate = new Date(today);
          futureDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
          responses[label] = futureDate.toISOString().split('T')[0];
          break;
        
        case 'select':
        case 'radio':
        case 'singleselect':
          // Pick first option if available or random if multiple options
          if (field.options && field.options.length > 0) {
            responses[label] = field.options[Math.floor(Math.random() * field.options.length)];
          } else {
            responses[label] = 'Option 1';
          }
          break;
        
        case 'checkbox':
        case 'multiselect':
          // Pick 1-2 random options if available
          if (field.options && field.options.length > 0) {
            const numToSelect = Math.min(1 + Math.floor(Math.random() * 2), field.options.length);
            const shuffled = [...field.options].sort(() => 0.5 - Math.random());
            responses[label] = shuffled.slice(0, numToSelect);
          } else {
            responses[label] = ['Option 1'];
          }
          break;
        
        default:
          responses[label] = 'Sample Response';
      }
    });
    
    return responses;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  isConnected(): boolean {
    return this.connected;
  }

  resetBackup(): void {
    this.backupEnabled = false;
  }

  getFormTemplates(): Record<FormTemplateKey, FormTemplate> {
    return this.formTemplates;
  }
}

// Add default export for better compatibility
export default OllamaService;
// Only export types not already exported in the file
export type { OllamaConfig, FormTemplate };
