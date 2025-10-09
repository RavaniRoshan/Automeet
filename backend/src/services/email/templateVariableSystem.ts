import { SupabaseClient } from '@supabase/supabase-js';

interface TemplateVariable {
  id: string;
  name: string;
  description: string;
  default_value: string;
  required: boolean;
  category: string; // e.g., 'prospect', 'campaign', 'user', 'meeting'
}

interface TemplateContext {
  prospect?: any;
  campaign?: any;
  user?: any;
  meeting?: any;
  custom?: Record<string, any>;
}

class TemplateVariableSystem {
  private supabase: SupabaseClient;
  private readonly defaultVariables: Record<string, string>;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    
    // Define default variables that are available in all templates
    this.defaultVariables = {
      'prospect.first_name': 'First name of the prospect',
      'prospect.last_name': 'Last name of the prospect',
      'prospect.company': 'Company name of the prospect',
      'prospect.title': 'Job title of the prospect',
      'prospect.email': 'Email address of the prospect',
      'campaign.name': 'Name of the campaign',
      'campaign.start_date': 'Start date of the campaign',
      'user.name': 'Name of the user sending the email',
      'user.company': 'Company name of the user',
      'meeting.date': 'Date of the meeting',
      'meeting.time': 'Time of the meeting',
      'meeting.link': 'Link to the meeting',
      'current_date': 'Current date',
      'current_time': 'Current time'
    };
  }

  /**
   * Registers a new template variable in the database
   */
  async registerVariable(variable: Omit<TemplateVariable, 'id'>): Promise<TemplateVariable> {
    try {
      const { data, error } = await this.supabase
        .from('template_variables')
        .insert([{
          name: variable.name,
          description: variable.description,
          default_value: variable.default_value,
          required: variable.required,
          category: variable.category
        }])
        .select()
        .single();

      if (error) {
        console.error('Error registering template variable:', error);
        throw error;
      }

      console.log(`Registered template variable: ${variable.name}`);
      return data;
    } catch (error) {
      console.error('Error registering template variable:', error);
      throw error;
    }
  }

  /**
   * Gets all available template variables
   */
  async getVariables(userId?: string): Promise<TemplateVariable[]> {
    try {
      let query = this.supabase
        .from('template_variables')
        .select('*');

      if (userId) {
        // If userId is provided, we can get user-specific variables
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        // Just get system-wide variables
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting template variables:', error);
        throw error;
      }

      // Add default variables if they're not in the database
      const allVariables = [...(data || [])];
      
      for (const [key, description] of Object.entries(this.defaultVariables)) {
        const exists = allVariables.some(v => v.name === key);
        if (!exists) {
          allVariables.push({
            id: key,
            name: key,
            description,
            default_value: '',
            required: false,
            category: this.getCategoryFromVariable(key)
          } as TemplateVariable);
        }
      }

      return allVariables;
    } catch (error) {
      console.error('Error getting template variables:', error);
      throw error;
    }
  }

  /**
   * Renders a template with the provided context
   */
  async renderTemplate(template: string, context: TemplateContext): Promise<string> {
    let renderedTemplate = template;

    // Replace all template variables in the template string
    renderedTemplate = this.replaceVariables(renderedTemplate, context);

    // Process any conditional statements
    renderedTemplate = await this.processConditionals(renderedTemplate, context);

    // Process any loops
    renderedTemplate = await this.processLoops(renderedTemplate, context);

    return renderedTemplate;
  }

  /**
   * Replaces template variables in the template string with actual values
   */
  private replaceVariables(template: string, context: TemplateContext): string {
    let result = template;

    // Regular expression to match template variables like {{variable.name}}
    const variableRegex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

    let match;
    while ((match = variableRegex.exec(result)) !== null) {
      const fullMatch = match[0];
      const variablePath = match[1];

      try {
        // Get the value from the context
        const value = this.getValueFromContext(context, variablePath) || this.getDefaultValue(variablePath);
        
        // Replace the variable with its value
        result = result.replace(fullMatch, value || '');
      } catch (error) {
        console.error(`Error replacing variable ${variablePath}:`, error);
        // Replace with empty string if there's an error
        result = result.replace(fullMatch, '');
      }
    }

    return result;
  }

  /**
   * Processes conditional statements in the template like {{#if variable}}...{{/if}}
   */
  private async processConditionals(template: string, context: TemplateContext): Promise<string> {
    // Regular expression to match conditional blocks
    const conditionalRegex = /\{\{#if\s+([a-zA-Z0-9_.]+)\}\}(.*?)\{\{\/if\}\}/gs;

    let result = template;
    let match;

    while ((match = conditionalRegex.exec(result)) !== null) {
      const fullMatch = match[0];
      const conditionVariable = match[1];
      const content = match[2];

      try {
        // Check if the condition variable exists and is truthy
        const conditionValue = this.getValueFromContext(context, conditionVariable);
        const isTruthy = this.isTruthy(conditionValue);

        // Replace the conditional block with content if condition is true, otherwise empty string
        result = result.replace(fullMatch, isTruthy ? content : '');
      } catch (error) {
        console.error(`Error processing conditional ${conditionVariable}:`, error);
        // Replace with empty string if there's an error
        result = result.replace(fullMatch, '');
      }
    }

    return result;
  }

  /**
   * Processes loop statements in the template like {{#each items}}...{{/each}}
   */
  private async processLoops(template: string, context: TemplateContext): Promise<string> {
    // Regular expression to match loop blocks
    const loopRegex = /\{\{#each\s+([a-zA-Z0-9_.]+)\}\}(.*?)\{\{\/each\}\}/gs;

    let result = template;
    let match;

    while ((match = loopRegex.exec(result)) !== null) {
      const fullMatch = match[0];
      const arrayVariable = match[1];
      const content = match[2];

      try {
        // Get the array from the context
        const arrayValue = this.getValueFromContext(context, arrayVariable);
        
        if (Array.isArray(arrayValue)) {
          let loopResult = '';
          
          // Process each item in the array
          for (let i = 0; i < arrayValue.length; i++) {
            const item = arrayValue[i];
            let itemContent = content;
            
            // Replace @index with the current index
            itemContent = itemContent.replace(/\{\{@index\}\}/g, i.toString());
            
            // Replace @item with the current item
            if (typeof item === 'object' && item !== null) {
              // If the item is an object, allow access to its properties
              const tempContext = { ...context, '@item': item };
              itemContent = this.replaceVariables(itemContent, tempContext);
            } else {
              // If the item is a primitive, replace {{@item}} directly
              itemContent = itemContent.replace(/\{\{@item\}\}/g, item.toString());
            }
            
            loopResult += itemContent;
          }
          
          result = result.replace(fullMatch, loopResult);
        } else {
          // If the value is not an array, replace with empty string
          result = result.replace(fullMatch, '');
        }
      } catch (error) {
        console.error(`Error processing loop ${arrayVariable}:`, error);
        // Replace with empty string if there's an error
        result = result.replace(fullMatch, '');
      }
    }

    return result;
  }

  /**
   * Gets a value from the context using a dot notation path
   */
  private getValueFromContext(context: TemplateContext, path: string): any {
    const keys = path.split('.');
    let current: any = context;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Gets a default value for a variable if not found in context
   */
  private getDefaultValue(variablePath: string): string {
    // Check if it's one of our default variables
    if (this.defaultVariables[variablePath]) {
      return `{{${variablePath}}}`; // Return as-is if not found in context
    }
    
    return ''; // Default to empty string for unknown variables
  }

  /**
   * Determines if a value is truthy for conditional processing
   */
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'string') {
      return value.length > 0 && value.toLowerCase() !== 'false';
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    
    return Boolean(value);
  }

  /**
   * Gets the category for a default variable
   */
  private getCategoryFromVariable(variable: string): string {
    if (variable.startsWith('prospect.')) {
      return 'prospect';
    } else if (variable.startsWith('campaign.')) {
      return 'campaign';
    } else if (variable.startsWith('user.')) {
      return 'user';
    } else if (variable.startsWith('meeting.')) {
      return 'meeting';
    } else {
      return 'general';
    }
  }

  /**
   * Validates that all required variables in a template are provided in the context
   */
  async validateTemplateVariables(template: string, context: TemplateContext): Promise<{ isValid: boolean; missingVariables: string[] }> {
    // Find all variables in the template
    const variableRegex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
    const matches = template.matchAll(variableRegex);
    
    const allVariables = Array.from(matches, match => match[1]);
    const uniqueVariables = [...new Set(allVariables)];
    
    // Separate required variables from optional ones
    const requiredVariables = await this.getRequiredVariables(uniqueVariables);
    
    // Check which required variables are missing from the context
    const missingVariables: string[] = [];
    
    for (const variable of requiredVariables) {
      const value = this.getValueFromContext(context, variable);
      if (value === undefined || value === null || value === '') {
        missingVariables.push(variable);
      }
    }
    
    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }

  /**
   * Gets the required variables from a list of variable names
   */
  private async getRequiredVariables(variableNames: string[]): Promise<string[]> {
    // Get the required variables from the database
    const { data, error } = await this.supabase
      .from('template_variables')
      .select('name')
      .in('name', variableNames)
      .eq('required', true);

    if (error) {
      console.error('Error getting required template variables:', error);
      return []; // Default to empty array if there's an error
    }

    // Include default required variables if any exist
    const requiredFromDb = data ? data.map(v => v.name) : [];
    return requiredFromDb; // For now, default variables are not required
  }

  /**
   * Creates a template preview with sample data
   */
  async createTemplatePreview(template: string, templateType: string = 'email'): Promise<string> {
    // Create sample context based on template type
    const sampleContext: TemplateContext = {
      prospect: {
        first_name: 'John',
        last_name: 'Doe',
        company: 'Acme Inc',
        title: 'CTO',
        email: 'john.doe@acme.com'
      },
      campaign: {
        name: 'Q4 Outreach',
        start_date: new Date().toISOString().split('T')[0]
      },
      user: {
        name: 'Jane Smith',
        company: 'My Company'
      },
      meeting: {
        date: '2023-12-15',
        time: '10:00 AM',
        link: 'https://meet.google.com/abc-defg-hij'
      },
      custom: {
        product_name: 'AutoMeet',
        trial_days: '14',
        special_offer: '20% off'
      }
    };

    return this.renderTemplate(template, sampleContext);
  }
}

export default TemplateVariableSystem;