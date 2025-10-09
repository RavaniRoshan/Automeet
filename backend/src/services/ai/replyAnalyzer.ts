import { GoogleGenerativeAI } from '@google/generative-ai';

interface ReplyAnalysis {
  sentiment: string; // 'positive', 'neutral', 'negative'
  meetingIntent: boolean;
  needsInfo: boolean;
  objection: string | null;
  interested: boolean;
  notInterested: boolean;
  availability: string | null; // If they mention availability
  followUpNeeded: boolean;
}

class ReplyAnalyzerService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  /**
   * Analyzes a reply using AI to determine sentiment, intent, and next steps
   */
  async analyzeReply(replyBody: string): Promise<ReplyAnalysis> {
    try {
      // Prepare prompt for Gemini to analyze the reply
      const prompt = `
        Analyze this email reply and provide the following information:
        1. Sentiment: 'positive', 'neutral', or 'negative'
        2. Does the reply show interest in scheduling a meeting? (true/false)
        3. Does the prospect need more information? (true/false)
        4. Is there an objection mentioned? If so, what is it? (string or null)
        5. Does the reply show general interest? (true/false)
        6. Does the reply show lack of interest? (true/false)
        7. Does the prospect mention specific availability/timing for a meeting? (string or null)
        8. Based on the content, would a follow-up be beneficial? (true/false)

        Reply content: ${replyBody}

        Respond in JSON format with the following structure:
        {
          "sentiment": "string",
          "meetingIntent": true/false,
          "needsInfo": true/false,
          "objection": "string or null",
          "interested": true/false,
          "notInterested": true/false,
          "availability": "string or null",
          "followUpNeeded": true/false
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      // Extract the JSON part from the response
      const jsonStart = textResponse.indexOf('{');
      const jsonEnd = textResponse.lastIndexOf('}') + 1;
      const jsonString = textResponse.substring(jsonStart, jsonEnd);
      
      const analysis: ReplyAnalysis = JSON.parse(jsonString);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing reply with AI:', error);
      
      // Return a default analysis in case of error
      return {
        sentiment: 'neutral',
        meetingIntent: false,
        needsInfo: false,
        objection: null,
        interested: false,
        notInterested: false,
        availability: null,
        followUpNeeded: true // Default to needing follow-up if we can't analyze
      };
    }
  }

  /**
   * Classifies the type of reply (e.g., interested, not interested, needs info)
   */
  async classifyReplyType(replyBody: string): Promise<string> {
    try {
      const analysis = await this.analyzeReply(replyBody);
      
      if (analysis.notInterested) {
        return 'not_interested';
      } else if (analysis.meetingIntent) {
        return 'meeting_requested';
      } else if (analysis.needsInfo) {
        return 'needs_info';
      } else if (analysis.objection) {
        return 'objection';
      } else if (analysis.interested) {
        return 'interested';
      } else {
        return 'neutral';
      }
    } catch (error) {
      console.error('Error classifying reply type:', error);
      return 'neutral';
    }
  }

  /**
   * Generates a suggested response based on the reply analysis
   */
  async generateSuggestedResponse(replyBody: string, context?: any): Promise<string> {
    try {
      const prompt = `
        Based on this email reply, generate a polite and contextually appropriate response:
        
        Reply: ${replyBody}
        
        Context: ${context ? JSON.stringify(context) : 'No additional context provided'}
        
        Generate a professional, friendly reply that addresses the prospect's concerns or questions.
        If they show interest in a meeting, suggest specific times or ask for their availability.
        If they have objections, address them respectfully.
        If they need more info, provide it or offer to provide it.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const suggestedResponse = response.text();
      
      return suggestedResponse;
    } catch (error) {
      console.error('Error generating suggested response:', error);
      return 'Thank you for your response. We appreciate your interest and will follow up shortly.';
    }
  }
}

// Default export for the service
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  console.error('Warning: GOOGLE_GEMINI_API_KEY environment variable is not set');
}

const replyAnalyzerService = apiKey ? new ReplyAnalyzerService(apiKey) : null;

export const analyzeReplyWithAI = async (replyBody: string): Promise<ReplyAnalysis> => {
  if (!replyAnalyzerService) {
    console.error('Reply analyzer service not initialized due to missing API key');
    return {
      sentiment: 'neutral',
      meetingIntent: false,
      needsInfo: false,
      objection: null,
      interested: false,
      notInterested: false,
      availability: null,
      followUpNeeded: true
    };
  }
  return await replyAnalyzerService.analyzeReply(replyBody);
};

export default ReplyAnalyzerService;