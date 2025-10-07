import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('Missing VITE_GEMINI_API_KEY environment variable');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface GeminiConfig {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamCallback {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export class GeminiService {
  private model: any;
  private config: GeminiConfig;

  constructor(config: GeminiConfig = {}) {
    if (!genAI) {
      throw new Error('Gemini API not initialized. Please check your API key.');
    }

    this.config = {
      model: config.model || 'gemini-2.0-flash-exp',
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxOutputTokens || 2048,
      systemInstruction: config.systemInstruction,
    };

    const modelConfig: any = {
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    };

    if (this.config.systemInstruction) {
      modelConfig.systemInstruction = this.config.systemInstruction;
    }

    this.model = genAI.getGenerativeModel({
      model: this.config.model,
      ...modelConfig,
    });
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStreamResponse(prompt: string, callback: StreamCallback): Promise<void> {
    try {
      const result = await this.model.generateContentStream(prompt);
      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        callback.onChunk(chunkText);
      }

      callback.onComplete(fullText);
    } catch (error) {
      console.error('Error generating stream response:', error);
      callback.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async chatWithHistory(messages: ChatMessage[], newMessage: string): Promise<string> {
    try {
      const chat = this.model.startChat({
        history: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(newMessage);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error in chat with history:', error);
      throw new Error(`Failed to generate chat response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chatStreamWithHistory(
    messages: ChatMessage[],
    newMessage: string,
    callback: StreamCallback
  ): Promise<void> {
    try {
      const chat = this.model.startChat({
        history: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessageStream(newMessage);
      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        callback.onChunk(chunkText);
      }

      callback.onComplete(fullText);
    } catch (error) {
      console.error('Error in chat stream with history:', error);
      callback.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  updateConfig(config: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...config };

    const modelConfig: any = {
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    };

    if (this.config.systemInstruction) {
      modelConfig.systemInstruction = this.config.systemInstruction;
    }

    this.model = genAI!.getGenerativeModel({
      model: this.config.model!,
      ...modelConfig,
    });
  }

  getConfig(): GeminiConfig {
    return { ...this.config };
  }
}

export const createGeminiService = (config?: GeminiConfig) => {
  return new GeminiService(config);
};
