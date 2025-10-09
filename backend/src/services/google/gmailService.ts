import { google } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';
import GoogleAuthService from './googleAuthService';

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  threadId?: string;  // For threading replies
  messageId?: string; // For tracking
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType: string;
  }>;
}

class GmailService {
  private supabase: SupabaseClient;
  private googleAuth: GoogleAuthService;

  constructor(supabaseClient: SupabaseClient, googleAuthService: GoogleAuthService) {
    this.supabase = supabaseClient;
    this.googleAuth = googleAuthService;
  }

  /**
   * Sends an email via Gmail API
   */
  async sendEmail(userId: string, message: EmailMessage): Promise<string> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Gmail API instance
      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Create the email message in RFC 2822 format
      let emailBody = `To: ${message.to}\r\n`;
      emailBody += `Subject: ${message.subject}\r\n`;
      emailBody += 'Content-Type: multipart/alternative; boundary="boundary"\r\n';
      emailBody += '\r\n';
      
      // Add text part
      if (message.text) {
        emailBody += '--boundary\r\n';
        emailBody += 'Content-Type: text/plain; charset=utf-8\r\n';
        emailBody += '\r\n';
        emailBody += message.text + '\r\n';
      }
      
      // Add HTML part
      emailBody += '--boundary\r\n';
      emailBody += 'Content-Type: text/html; charset=utf-8\r\n';
      emailBody += '\r\n';
      emailBody += message.html + '\r\n';
      emailBody += '--boundary--';

      // Encode the email as base64
      const encodedMessage = Buffer.from(emailBody).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      // Prepare the send request
      const sendRequest: any = {
        userId: 'me', // 'me' refers to the authenticated user
        requestBody: {
          raw: encodedMessage
        }
      };

      // If there's a thread ID, add it to continue the thread
      if (message.threadId) {
        sendRequest.requestBody.threadId = message.threadId;
      }

      // Send the email
      const response = await gmail.users.messages.send(sendRequest);

      // Log the email event in the database
      await this.logEmailEvent(userId, message.to, 'sent', response.data.id, message.threadId);

      console.log(`Email sent successfully with message ID: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('Error sending email via Gmail API:', error);
      throw error;
    }
  }

  /**
   * Gets a list of recent emails from the user's Gmail inbox
   */
  async getRecentEmails(userId: string, maxResults: number = 10, query?: string): Promise<any[]> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Gmail API instance
      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Prepare the list request
      const listRequest: any = {
        userId: 'me',
        maxResults: maxResults
      };

      if (query) {
        listRequest.q = query; // e.g., 'from:prospect@example.com', 'is:unread', etc.
      }

      // Get the list of messages
      const response = await gmail.users.messages.list(listRequest);

      if (!response.data.messages || response.data.messages.length === 0) {
        console.log('No messages found.');
        return [];
      }

      // Get full details for each message
      const emailDetailsPromises = response.data.messages.map(async (message) => {
        return await this.getEmailById(userId, message.id);
      });

      const emailDetails = await Promise.all(emailDetailsPromises);
      return emailDetails;
    } catch (error) {
      console.error('Error getting recent emails:', error);
      throw error;
    }
  }

  /**
   * Gets a specific email by its ID
   */
  async getEmailById(userId: string, messageId: string): Promise<any> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Gmail API instance
      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Get the message details
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full' // Get the full message details
      });

      return response.data;
    } catch (error) {
      console.error(`Error getting email with ID ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Gets emails from a specific thread
   */
  async getEmailsFromThread(userId: string, threadId: string): Promise<any[]> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Gmail API instance
      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Get the thread details
      const response = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      });

      if (!response.data.messages) {
        return [];
      }

      // Return all messages in the thread
      return response.data.messages;
    } catch (error) {
      console.error(`Error getting emails from thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Creates a draft email
   */
  async createDraft(userId: string, message: EmailMessage): Promise<string> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Gmail API instance
      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Create the email message in RFC 2822 format
      let emailBody = `To: ${message.to}\r\n`;
      emailBody += `Subject: ${message.subject}\r\n`;
      emailBody += 'Content-Type: multipart/alternative; boundary="boundary"\r\n';
      emailBody += '\r\n';
      
      // Add text part
      if (message.text) {
        emailBody += '--boundary\r\n';
        emailBody += 'Content-Type: text/plain; charset=utf-8\r\n';
        emailBody += '\r\n';
        emailBody += message.text + '\r\n';
      }
      
      // Add HTML part
      emailBody += '--boundary\r\n';
      emailBody += 'Content-Type: text/html; charset=utf-8\r\n';
      emailBody += '\r\n';
      emailBody += message.html + '\r\n';
      emailBody += '--boundary--';

      // Encode the email as base64
      const encodedMessage = Buffer.from(emailBody).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      // Create the draft
      const response = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedMessage
          }
        }
      });

      console.log(`Draft created successfully with ID: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('Error creating draft:', error);
      throw error;
    }
  }

  /**
   * Sends a draft email
   */
  async sendDraft(userId: string, draftId: string): Promise<string> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Gmail API instance
      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Send the draft
      const response = await gmail.users.drafts.send({
        userId: 'me',
        requestBody: {
          id: draftId
        }
      });

      console.log(`Draft sent successfully with message ID: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('Error sending draft:', error);
      throw error;
    }
  }

  /**
   * Logs an email event in the database
   */
  private async logEmailEvent(userId: string, recipient: string, eventType: string, messageId?: string, threadId?: string): Promise<void> {
    try {
      // Find the prospect associated with this email
      const { data: prospect, error: prospectError } = await this.supabase
        .from('prospects')
        .select('id')
        .eq('email', recipient)
        .single();

      if (prospectError) {
        console.error(`Error finding prospect with email ${recipient}:`, prospectError);
        // We'll continue without linking to a prospect if not found
      }

      // Insert the email event
      const { error } = await this.supabase
        .from('email_events')
        .insert({
          prospect_id: prospect?.id || null, // Use null if prospect not found
          event_type: eventType,
          timestamp: new Date().toISOString(),
          metadata: {
            message_id: messageId,
            thread_id: threadId,
            recipient: recipient
          }
        });

      if (error) {
        console.error('Error logging email event:', error);
        // Don't throw error as this is just logging, not critical to email sending
      }
    } catch (error) {
      console.error('Unexpected error logging email event:', error);
      // Don't throw error as this is just logging, not critical to email sending
    }
  }

  /**
   * Checks for new replies to campaign emails
   */
  async checkForReplies(userId: string): Promise<any[]> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Gmail API instance
      const gmail = google.gmail({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Search for unread emails from prospects
      // This would typically look for emails from people we've emailed
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread from:me', // Find unread emails that we sent (this is just an example query)
        maxResults: 50
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        console.log('No new replies found.');
        return [];
      }

      // Get full details for each message
      const emailDetailsPromises = response.data.messages.map(async (message) => {
        return await this.getEmailById(userId, message.id);
      });

      const emailDetails = await Promise.all(emailDetailsPromises);
      return emailDetails;
    } catch (error) {
      console.error('Error checking for replies:', error);
      throw error;
    }
  }
}

export default GmailService;