import { SupabaseClient } from '@supabase/supabase-js';
import GmailService from '../google/gmailService';
import { analyzeReplyWithAI } from '../ai/replyAnalyzer'; // This will be created later

interface EmailThread {
  id: string;
  prospect_id: string;
  campaign_id: string;
  thread_id: string;
  subject: string;
  last_message_body: string;
  sent_at: string;
  last_reply_at: string;
  reply_count: number;
  sentiment: string;
  is_active: boolean;
}

class GmailThreadTracker {
  private supabase: SupabaseClient;
  private gmailService: GmailService;

  constructor(supabaseClient: SupabaseClient, gmailService: GmailService) {
    this.supabase = supabaseClient;
    this.gmailService = gmailService;
  }

  /**
   * Monitors conversation threads for new replies
   */
  async monitorThreadsForReplies(): Promise<void> {
    try {
      console.log('Monitoring email threads for new replies...');

      // Get all active threads that might have new replies
      const { data: activeThreads, error } = await this.supabase
        .from('email_threads')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching active email threads:', error);
        throw new Error(`Failed to fetch active threads: ${error.message}`);
      }

      if (!activeThreads || activeThreads.length === 0) {
        console.log('No active email threads to monitor.');
        return;
      }

      // Process each active thread
      for (const thread of activeThreads) {
        await this.checkThreadForNewReplies(thread);
      }

      console.log(`Completed monitoring ${activeThreads.length} active threads.`);
    } catch (error) {
      console.error('Error in monitorThreadsForReplies:', error);
      throw error;
    }
  }

  /**
   * Checks a specific thread for new replies
   */
  async checkThreadForNewReplies(thread: EmailThread): Promise<void> {
    try {
      console.log(`Checking thread ${thread.thread_id} for new replies...`);

      // Get the prospect associated with this thread
      const { data: prospect, error: prospectError } = await this.supabase
        .from('prospects')
        .select('email')
        .eq('id', thread.prospect_id)
        .single();

      if (prospectError) {
        console.error(`Error fetching prospect for thread ${thread.id}:`, prospectError);
        return;
      }

      // Get messages from the thread
      const messages = await this.gmailService.getEmailsFromThread(
        await this.getUserIdFromCampaign(thread.campaign_id),
        thread.thread_id
      );

      if (!messages || messages.length === 0) {
        console.log(`No messages found in thread ${thread.thread_id}`);
        return;
      }

      // Find new replies that we haven't processed yet
      // This looks for messages that are replies (not sent by us) and newer than last_reply_at
      const newReplies = messages.filter(message => {
        // Check if this is a reply (not sent by us)
        const isReply = !message.payload.headers.some(
          (header: any) => header.name === 'From' && header.value.includes('me')
        );

        // Check if it's newer than the last reply we processed
        const messageDate = new Date(message.internalDate * 1000); // Convert from timestamp
        const lastReplyDate = new Date(thread.last_reply_at || thread.sent_at);

        return isReply && messageDate > lastReplyDate;
      });

      if (newReplies.length === 0) {
        console.log(`No new replies found in thread ${thread.thread_id}`);
        return;
      }

      console.log(`Found ${newReplies.length} new replies in thread ${thread.thread_id}`);

      // Process each new reply
      for (const reply of newReplies) {
        await this.processNewReply(thread, reply);
      }

      // Update the thread with the latest reply information
      await this.updateThreadWithLatestReply(thread.id, newReplies[newReplies.length - 1]);
    } catch (error) {
      console.error(`Error checking thread ${thread.thread_id} for new replies:`, error);
      throw error;
    }
  }

  /**
   * Processes a new reply from a prospect
   */
  private async processNewReply(thread: EmailThread, reply: any): Promise<void> {
    try {
      // Extract the reply content
      const replyContent = this.extractEmailContent(reply);

      console.log(`Processing new reply from thread ${thread.thread_id}:`, replyContent.subject);

      // Update the prospect's engagement status
      await this.updateProspectEngagement(thread.prospect_id, 'replied');

      // Log the reply event
      await this.logEmailEvent(thread.prospect_id, 'replied', reply.id, thread.id);

      // Analyze the reply with AI to determine sentiment and intent
      const analysis = await analyzeReplyWithAI(replyContent.body);

      // Update the email thread with sentiment analysis
      await this.updateThreadSentiment(thread.id, analysis.sentiment);

      // Based on the analysis, decide next steps
      if (analysis.meetingIntent) {
        // If the reply indicates meeting interest, update prospect status
        await this.updateProspectEngagement(thread.prospect_id, 'meeting_scheduled');
        
        // Potentially create a meeting request (this would be handled by another service)
        console.log(`Meeting intent detected in reply from prospect ${thread.prospect_id}`);
      } else if (analysis.needsInfo) {
        // The prospect needs more information, consider sending follow-up
        console.log(`Prospect ${thread.prospect_id} needs more information`);
      } else if (analysis.objection) {
        // Handle objections appropriately
        console.log(`Objection detected in reply from prospect ${thread.prospect_id}`);
      }

      // Update campaign metrics based on the reply
      await this.updateCampaignMetrics(thread.campaign_id);
    } catch (error) {
      console.error(`Error processing reply from thread ${thread.thread_id}:`, error);
      throw error;
    }
  }

  /**
   * Updates an email thread with the latest reply information
   */
  private async updateThreadWithLatestReply(threadId: string, latestReply: any): Promise<void> {
    try {
      const replyContent = this.extractEmailContent(latestReply);
      const replyDate = new Date(latestReply.internalDate * 1000).toISOString();

      const { error } = await this.supabase
        .from('email_threads')
        .update({
          last_message_body: replyContent.body.substring(0, 500) + '...', // Truncate for storage
          last_reply_at: replyDate,
          reply_count: this.supabase.rpc('increment_reply_count', { thread_id: threadId }),
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId);

      if (error) {
        console.error(`Error updating thread ${threadId} with latest reply:`, error);
        throw new Error(`Failed to update thread: ${error.message}`);
      }

      console.log(`Thread ${threadId} updated with latest reply from ${replyDate}`);
    } catch (error) {
      console.error(`Error updating thread ${threadId} with latest reply:`, error);
      throw error;
    }
  }

  /**
   * Updates the sentiment of an email thread
   */
  private async updateThreadSentiment(threadId: string, sentiment: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('email_threads')
        .update({
          sentiment: sentiment,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId);

      if (error) {
        console.error(`Error updating sentiment for thread ${threadId}:`, error);
        throw new Error(`Failed to update thread sentiment: ${error.message}`);
      }

      console.log(`Thread ${threadId} sentiment updated to ${sentiment}`);
    } catch (error) {
      console.error(`Error updating thread sentiment for ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Gets user ID from campaign ID (helper function)
   */
  private async getUserIdFromCampaign(campaignId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('user_id')
        .eq('id', campaignId)
        .single();

      if (error) {
        console.error(`Error fetching user ID for campaign ${campaignId}:`, error);
        throw new Error(`Failed to fetch user ID: ${error.message}`);
      }

      return data.user_id;
    } catch (error) {
      console.error(`Error in getUserIdFromCampaign for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Updates the prospect's engagement status
   */
  private async updateProspectEngagement(prospectId: string, status: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('prospects')
        .update({ engagement_status: status })
        .eq('id', prospectId);

      if (error) {
        console.error(`Error updating engagement status for prospect ${prospectId}:`, error);
        throw new Error(`Failed to update prospect engagement: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error in updateProspectEngagement for ${prospectId}:`, error);
      throw error;
    }
  }

  /**
   * Logs an email event in the database
   */
  private async logEmailEvent(prospectId: string, eventType: string, messageId: string, threadId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('email_events')
        .insert({
          prospect_id: prospectId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          metadata: {
            message_id: messageId,
            thread_id: threadId
          }
        });

      if (error) {
        console.error(`Error logging email event for prospect ${prospectId}:`, error);
        // Don't throw error as this is just logging
      }
    } catch (error) {
      console.error(`Unexpected error logging email event for prospect ${prospectId}:`, error);
      // Don't throw error as this is just logging
    }
  }

  /**
   * Updates campaign metrics based on thread activity
   */
  private async updateCampaignMetrics(campaignId: string): Promise<void> {
    try {
      // Calculate metrics like reply rate, engagement rate, etc.
      // This would involve more complex queries to aggregate data
      console.log(`Updating campaign metrics for ${campaignId} (implementation to follow)`);
    } catch (error) {
      console.error(`Error updating campaign metrics for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Extracts content from a Gmail message object
   */
  private extractEmailContent(message: any): { subject: string; body: string } {
    // Initialize with defaults
    let subject = '';
    let body = '';

    // Extract subject from headers
    if (message.payload && message.payload.headers) {
      const subjectHeader = message.payload.headers.find((header: any) => header.name === 'Subject');
      if (subjectHeader) {
        subject = subjectHeader.value;
      }
    }

    // Extract body content - Gmail API returns content differently based on format
    if (message.payload && message.payload.parts && Array.isArray(message.payload.parts)) {
      // Look for the text/plain or text/html part
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          // The body data is base64 encoded
          if (part.body && part.body.data) {
            // Decode base64 and convert to string
            const buff = Buffer.from(part.body.data, 'base64');
            body = buff.toString('utf-8');
            break;
          }
        }
      }
    } 
    // Alternative: if there's no multipart, try the body directly
    else if (message.payload && message.payload.body && message.payload.body.data) {
      const buff = Buffer.from(message.payload.body.data, 'base64');
      body = buff.toString('utf-8');
    }

    return { subject, body };
  }

  /**
   * Marks a thread as inactive (when conversation is concluded)
   */
  async deactivateThread(threadId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('email_threads')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId);

      if (error) {
        console.error(`Error deactivating thread ${threadId}:`, error);
        throw new Error(`Failed to deactivate thread: ${error.message}`);
      }

      console.log(`Thread ${threadId} marked as inactive`);
    } catch (error) {
      console.error(`Error deactivating thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Creates a new email thread if one doesn't exist
   */
  async createThreadIfNotExists(prospectId: string, campaignId: string, threadId: string, subject: string): Promise<void> {
    try {
      // Check if thread already exists
      const { data: existingThread, error } = await this.supabase
        .from('email_threads')
        .select('id')
        .eq('thread_id', threadId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error(`Error checking for existing thread ${threadId}:`, error);
        throw new Error(`Failed to check for existing thread: ${error.message}`);
      }

      // If thread doesn't exist, create it
      if (!existingThread) {
        const { error: insertError } = await this.supabase
          .from('email_threads')
          .insert({
            prospect_id: prospectId,
            campaign_id: campaignId,
            thread_id: threadId,
            subject: subject,
            last_message_body: 'Initial email thread created',
            sent_at: new Date().toISOString(),
            reply_count: 0,
            is_active: true
          });

        if (insertError) {
          console.error(`Error creating new thread ${threadId}:`, insertError);
          throw new Error(`Failed to create thread: ${insertError.message}`);
        }

        console.log(`New thread created with thread_id ${threadId}`);
      } else {
        console.log(`Thread ${threadId} already exists`);
      }
    } catch (error) {
      console.error(`Error in createThreadIfNotExists for ${threadId}:`, error);
      throw error;
    }
  }
}

export default GmailThreadTracker;