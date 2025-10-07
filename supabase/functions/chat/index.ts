import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  conversationId: string;
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  history?: Array<{ role: string; content: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const requestData: ChatRequest = await req.json();
    const {
      conversationId,
      message,
      model = "gemini-2.0-flash-exp",
      temperature = 0.7,
      maxTokens = 2048,
      systemPrompt,
      history = [],
    } = requestData;

    const startTime = Date.now();

    const { data: userMessage, error: userMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
        tokens_used: 0,
      })
      .select()
      .single();

    if (userMessageError) {
      throw new Error("Failed to save user message");
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const modelConfig: any = {
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemPrompt) {
      modelConfig.systemInstruction = systemPrompt;
    }

    const aiModel = genAI.getGenerativeModel({
      model,
      ...modelConfig,
    });

    let aiResponse: string;

    if (history.length > 0) {
      const chat = aiModel.startChat({
        history: history.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(message);
      aiResponse = result.response.text();
    } else {
      const result = await aiModel.generateContent(message);
      aiResponse = result.response.text();
    }

    const responseTime = Date.now() - startTime;

    const { data: assistantMessage, error: assistantMessageError } =
      await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: aiResponse,
          tokens_used: 0,
          metadata: { response_time_ms: responseTime },
        })
        .select()
        .single();

    if (assistantMessageError) {
      throw new Error("Failed to save assistant message");
    }

    await supabase.from("usage_metrics").insert({
      user_id: user.id,
      conversation_id: conversationId,
      tokens_input: 0,
      tokens_output: 0,
      api_calls: 1,
      response_time_ms: responseTime,
      error_occurred: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        userMessage,
        assistantMessage,
        responseTime,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
