import { SupabaseClient } from '@supabase/supabase-js';
import GmailService from '../google/gmailService';
import { analyzeReplyWithAI } from '../ai/replyAnalyzer'; // This will be created later

interface EmailReply {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  snippet: string;
  body: string;
  labels: string[];
}

class ReplyDetectionService {
  private supabase: SupabaseClient;
  private gmailService: GmailService;

  constructor(supabaseClient: SupabaseClient, gmailService: GmailService) {
    this.supabase = supabaseClient;
    this.gmailService = gmailService;
  }

  /**
   * Fetches new messages from prospects using Gmail API
   */
  async fetchNewReplies(userId: string): Promise<EmailReply[]> {
    try {
      console.log(`Fetching new replies for user ${userId}...`);

      // Get messages from the user's Gmail inbox
      // Look specifically for replies from prospects (emails that contain our sent emails plus prospect responses)
      const messages = await this.gmailService.getRecentEmails(
        userId, 
        50, // Get last 50 messages
        'from:me label:unread' // Query to find unread messages that might be replies
      );

      if (!messages || messages.length === 0) {
        console.log(`No new messages found for user ${userId}`);
        return [];
      }

      // Filter messages that are likely replies from prospects
      const prospectReplies = await this.filterProspectReplies(userId, messages);

      // Process each detected reply
      const processedReplies: EmailReply[] = [];
      for (const message of prospectReplies) {
        const reply = await this.processReply(userId, message);
        if (reply) {
          processedReplies.push(reply);
        }
      }

      console.log(`Found ${processedReplies.length} new prospect replies for user ${userId}`);
      return processedReplies;
    } catch (error) {
      console.error(`Error fetching new replies for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Filters messages to identify those likely from prospects
   */
  private async filterProspectReplies(userId: string, messages: any[]): Promise<any[]> {
    try {
      // Get all prospects associated with the user's campaigns
      const { data: prospects, error: prospectsError } = await this.supabase
        .from('prospects')
        .select('email, campaign_id')
        .join('campaigns', 'prospects.campaign_id', 'campaigns.id')
        .eq('campaigns.user_id', userId);

      if (prospectsError) {
        console.error(`Error fetching prospects for user ${userId}:`, prospectsError);
        return [];
      }

      if (!prospects || prospects.length === 0) {
        console.log(`No prospects found for user ${userId}`);
        return [];
      }

      // Create a set of prospect emails for quick lookup
      const prospectEmails = new Set(prospects.map(prospect => prospect.email.toLowerCase()));

      // Filter messages that are from known prospects
      const prospectMessages = messages.filter(message => {
        // Check if any of the 'from' addresses matches a prospect
        const fromHeader = message.payload.headers.find((header: any) => header.name.toLowerCase() === 'from');
        if (fromHeader) {
          const fromEmail = this.extractEmailFromHeader(fromHeader.value);
          return fromEmail && prospectEmails.has(fromEmail.toLowerCase());
        }
        return false;
      });

      console.log(`Identified ${prospectMessages.length} messages from prospects`);

      return prospectMessages;
    } catch (error) {
      console.error(`Error filtering prospect replies for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Processes a single reply message
   */
  private async processReply(userId: string, message: any): Promise<EmailReply | null> {
    try {
      if (!message.id) {
        console.warn('Message missing ID, skipping');
        return null;
      }

      // Extract message details
      const headers = message.payload.headers;
      const subjectHeader = headers.find((header: any) => header.name.toLowerCase() === 'subject');
      const fromHeader = headers.find((header: any) => header.name.toLowerCase() === 'from');
      const toHeader = headers.find((header: any) => header.name.toLowerCase() === 'to');
      const dateHeader = headers.find((header: any) => header.name.toLowerCase() === 'date');

      // Extract email addresses
      const fromEmail = this.extractEmailFromHeader(fromHeader?.value);
      const toEmail = this.extractEmailFromHeader(toHeader?.value);
      const subject = subjectHeader?.value || '';

      // Extract the body content
      const body = this.extractEmailBody(message);

      // Parse the date
      const date = dateHeader ? new Date(dateHeader.value) : new Date();

      // Get the thread ID
      const threadId = message.threadId;

      // Create the reply object
      const reply: EmailReply = {
        id: message.id,
        threadId: threadId,
        subject: subject,
        from: fromEmail,
        to: toEmail,
        date: date,
        snippet: message.snippet || '',
        body: body,
        labels: message.labelIds || []
      };

      // Log the reply in our system
      await this.logReplyEvent(userId, reply);

      // Update the email thread with this reply
      await this.updateEmailThread(userId, reply);

      // Analyze the reply content with AI
      await this.analyzeReplyContent(userId, reply);

      // Update prospect engagement status based on the reply
      await this.updateProspectStatus(userId, fromEmail, 'replied');

      // Mark the email as read in Gmail to avoid processing again
      await this.gmailService.createDraft(userId, {
        to: fromEmail,
        subject: subject,
        html: body,
        threadId: threadId, // This will put it in the same thread
        messageId: message.id
      });

      console.log(`Processed reply from ${fromEmail}: ${subject}`);
      return reply;
    } catch (error) {
      console.error('Error processing reply:', error);
      return null;
    }
  }

  /**
   * Extracts email address from a header value like "Name <email@example.com>"
   */
  private extractEmailFromHeader(headerValue: string): string | null {
    if (!headerValue) {
      return null;
    }

    // Match email addresses in the format "Name <email@example.com>"
    const emailMatch = headerValue.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    return emailMatch ? emailMatch[0] : null;
  }

  /**
   * Extracts the body content from a Gmail message
   */
  private extractEmailBody(message: any): string {
    // Initialize body
    let body = '';

    // If the message has payload parts (multipart message)
    if (message.payload && message.payload.parts && Array.isArray(message.payload.parts)) {
      // Look for the text/plain or text/html part
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          // The body data is base64 encoded
          if (part.body && part.body.data) {
            try {
              // Decode base64 and convert to string
              const buff = Buffer.from(part.body.data, 'base64');
              body = buff.toString('utf-8');
              break;
            } catch (decodeError) {
              console.error('Error decoding email body:', decodeError);
            }
          }
        }
      }
    } 
    // Alternative: if there's no multipart, try the body directly
    else if (message.payload && message.payload.body && message.payload.body.data) {
      try {
        const buff = Buffer.from(message.payload.body.data, 'base64');
        body = buff.toString('utf-8');
      } catch (decodeError) {
        console.error('Error decoding email body:', decodeError);
      }
    }

    return body;
  }

  /**
   * Logs the reply event in the database
   */
  private async logReplyEvent(userId: string, reply: EmailReply): Promise<void> {
    try {
      // Find the prospect ID based on the sender's email
      const { data: prospect, error: prospectError } = await this.supabase
        .from('prospects')
        .select('id, campaign_id')
        .eq('email', reply.from)
        .single();

      if (prospectError) {
        console.error(`Error finding prospect with email ${reply.from}:`, prospectError);
        // Continue without linking to a prospect if not found
      }

      // Insert the email event
      const { error } = await this.supabase
        .from('email_events')
        .insert({
          prospect_id: prospect?.id || null,
          event_type: 'replied',
          timestamp: reply.date.toISOString(),
          metadata: {
            message_id: reply.id,
            thread_id: reply.threadId,
            subject: reply.subject,
            from: reply.from,
            to: reply.to
          }
        });

      if (error) {
        console.error(`Error logging reply event for user ${userId}:`, error);
        // Don't throw error as this is just logging
      } else {
        console.log(`Reply event logged for email ${reply.id}`);
      }
    } catch (error) {
      console.error(`Unexpected error logging reply event for user ${userId}:`, error);
      // Don't throw error as this is just logging
    }
  }

  /**
   * Updates the email thread with the new reply
   */
  private async updateEmailThread(userId: string, reply: EmailReply): Promise<void> {
    try {
      // First, find the prospect by the sender's email
      const { data: prospect, error: prospectError } = await this.supabase
        .from('prospects')
        .select('id, campaign_id')
        .eq('email', reply.from)
        .single();

      if (prospectError) {
        console.error(`Error finding prospect with email ${reply.from}:`, prospectError);
        return; // Can't update thread if we don't know the prospect
      }

      if (!prospect) {
        console.error(`Prospect with email ${reply.from} not found for user ${userId}`);
        return;
      }

      // Check if a thread already exists for this prospect and campaign
      const { data: existingThread, error: threadError } = await this.supabase
        .from('email_threads')
        .select('*')
        .eq('prospect_id', prospect.id)
        .eq('campaign_id', prospect.campaign_id)
        .single();

      if (threadError && threadError.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error(`Error checking for email thread for prospect ${prospect.id}:`, threadError);
        return;
      }

      if (existingThread) {
        // Update the existing thread
        const { error: updateError } = await this.supabase
          .from('email_threads')
          .update({
            last_message_body: reply.body.substring(0, 500) + '...', // Truncate to avoid large storage
            last_reply_at: reply.date.toISOString(),
            reply_count: existingThread.reply_count + 1,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingThread.id);

        if (updateError) {
          console.error(`Error updating email thread ${existingThread.id}:`, updateError);
        } else {
          console.log(`Email thread ${existingThread.id} updated with new reply`);
        }
      } else {
        // Create a new thread record
        const { error: insertError } = await this.supabase
          .from('email_threads')
          .insert({
            prospect_id: prospect.id,
            campaign_id: prospect.campaign_id,
            thread_id: reply.threadId,
            subject: reply.subject,
            last_message_body: reply.body.substring(0, 500) + '...', // Truncate
            sent_at: reply.date.toISOString(), // Technically received, but using same field
            last_reply_at: reply.date.toISOString(),
            reply_count: 1,
            is_active: true
          });

        if (insertError) {
          console.error(`Error creating email thread for prospect ${prospect.id}:`, insertError);
        } else {
          console.log(`Email thread created for prospect ${prospect.id}`);
        }
      }
    } catch (error) {
      console.error(`Error updating email thread for reply ${reply.id}:`, error);
      throw error;
    }
  }

  /**
   * Analyzes the reply content using AI
   */
  private async analyzeReplyContent(userId: string, reply: EmailReply): Promise<void> {
    try {
      console.log(`Analyzing reply content from ${reply.from}...`);

      // Use the AI reply analyzer to classify the response
      const analysis = await analyzeReplyWithAI(reply.body);

      // Update the email thread with sentiment analysis
      await this.updateThreadSentiment(reply.threadId, analysis);

      // Potentially trigger follow-up actions based on analysis
      await this.handleAnalysisResult(userId, reply, analysis);
    } catch (error) {
      console.error(`Error analyzing reply content from ${reply.from}:`, error);
      // Don't throw error - analysis failure shouldn't break the flow
    }
  }

  /**
   * Updates thread sentiment based on AI analysis
   */
  private async updateThreadSentiment(threadId: string, analysis: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('email_threads')
        .update({
          sentiment: analysis.sentiment,
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId);

      if (error) {
        console.error(`Error updating sentiment for thread ${threadId}:`, error);
      } else {
        console.log(`Thread ${threadId} sentiment updated to ${analysis.sentiment}`);
      }
    } catch (error) {
      console.error(`Error in updateThreadSentiment for thread ${threadId}:`, error);
    }
  }

  /**
   * Handles the results from AI analysis
   */
  private async handleAnalysisResult(userId: string, reply: EmailReply, analysis: any): Promise<void> {
    try {
      // Find the prospect based on the sender's email
      const { data: prospect, error: prospectError } = await this.supabase
        .from('prospects')
        .select('id, campaign_id')
        .eq('email', reply.from)
        .single();

      if (prospectError || !prospect) {
        console.error(`Could not find prospect for email ${reply.from}:`, prospectError);
        return;
      }

      // Handle different analysis results
      if (analysis.meetingIntent) {
        // Prospect expressed interest in scheduling a meeting
        await this.updateProspectStatus(userId, reply.from, 'meeting_scheduled');
        console.log(`Meeting intent detected for prospect ${prospect.id}`);
        
        // Potentially trigger meeting scheduling workflow
        // (this would be handled by another service)
      } else if (analysis.needsInfo) {
        // Prospect needs more information
        console.log(`Prospect ${prospect.id} needs more information`);
      } else if (analysis.objection) {
        // Prospect raised an objection
        console.log(`Objection detected from prospect ${prospect.id}: ${analysis.objection}`);
      } else if (analysis.interested) {
        // Prospect is interested but may need more time
        console.log(`Prospect ${prospect.id} shows interest`);
      } else if (analysis.notInterested) {
        // Prospect is not interested
        await this.updateProspectStatus(userId, reply.from, 'completed');
        console.log(`Prospect ${prospect.id} not interested, marking as completed`);
      }
    } catch (error) {
      console.error(`Error handling analysis result for reply ${reply.id}:`, error);
    }
  }

  /**
   * Updates prospect engagement status
   */
  private async updateProspectStatus(userId: string, email: string, status: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('prospects')
        .update({ engagement_status: status })
        .eq('email', email);

      if (error) {
        console.error(`Error updating prospect status for ${email}:`, error);
        throw new Error(`Failed to update prospect status: ${error.message}`);
      }

      console.log(`Prospect ${email} status updated to ${status}`);
    } catch (error) {
      console.error(`Error in updateProspectStatus for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Checks for replies in a specific thread
   */
  async checkThreadForReplies(userId: string, threadId: string): Promise<EmailReply[]> {
    try {
      console.log(`Checking thread ${threadId} for new replies...`);

      // Get messages in the specific thread
      const messages = await this.gmailService.getEmailsFromThread(userId, threadId);

      if (!messages || messages.length === 0) {
        console.log(`No messages in thread ${threadId}`);
        return [];
      }

      // Process each message to identify replies
      const newReplies: EmailReply[] = [];
      for (const message of messages) {
        // Check if this is a reply from a prospect (not sent by user)
        const fromHeader = message.payload.headers.find((header: any) => header.name.toLowerCase() === 'from');
        const fromEmail = this.extractEmailFromHeader(fromHeader?.value);

        if (fromEmail && !fromEmail.includes('user-email-placeholder')) { // Replace with actual check
          const reply = await this.processReply(userId, message);
          if (reply) {
            newReplies.push(reply);
          }
        }
      }

      console.log(`Found ${newReplies.length} new replies in thread ${threadId}`);
      return newReplies;
    } catch (error) {
      console.error(`Error checking thread ${threadId} for replies:`, error);
      throw error;
    }
  }

  /**
   * Marks a message as processed to prevent duplicate processing
   */
  async markReplyAsProcessed(messageId: string): Promise<void> {
    try {
      // In a real implementation, we might add a processed flag to email_events
      // or use Gmail's label system to track processed messages
      console.log(`Marking message ${messageId} as processed`);
    } catch (error) {
      console.error(`Error marking message ${messageId} as processed:`, error);
    }
  }
}

export default ReplyDetectionService;