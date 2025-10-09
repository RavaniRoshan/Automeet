import { SupabaseClient } from '@supabase/supabase-js';
import GmailService from '../google/gmailService';
import { EmailMessage } from '../google/gmailService';

interface ProspectData {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  job_title: string;
  industry: string;
  enrichment_data: any;
}

interface CampaignData {
  id: string;
  name: string;
  user_id: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string; // HTML content with placeholders
  campaign_id: string;
  step_number: number;
}

class EmailComposer {
  private supabase: SupabaseClient;
  private gmailService: GmailService;

  constructor(supabaseClient: SupabaseClient, gmailService: GmailService) {
    this.supabase = supabaseClient;
    this.gmailService = gmailService;
  }

  /**
   * Composes and sends a personalized email to a prospect
   */
  async composeAndSendEmail(
    userId: string,
    campaignId: string,
    prospectId: string,
    templateId: string,
    stepNumber: number
  ): Promise<string> {
    try {
      console.log(`Composing email for prospect ${prospectId} in campaign ${campaignId}, step ${stepNumber}`);

      // Get the prospect data
      const prospect = await this.getProspectData(prospectId);
      
      // Get the campaign data
      const campaign = await this.getCampaignData(campaignId);
      
      // Get the email template
      const template = await this.getEmailTemplate(templateId);

      // Personalize the email content
      const personalizedEmail = await this.personalizeEmail(template, prospect, campaign);

      // Send the email via Gmail
      const messageId = await this.gmailService.sendEmail(userId, personalizedEmail);

      // Log the email in the email_events table
      await this.logEmailEvent(prospectId, 'sent', messageId, template.step_number);

      // Update the prospect's engagement status
      await this.updateProspectEngagement(prospectId, 'contacted');

      // Update the email thread if this is a follow-up
      await this.updateEmailThread(prospectId, campaignId, messageId, personalizedEmail.subject);

      console.log(`Email sent successfully to ${prospect.email} with message ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error(`Error composing and sending email to prospect ${prospectId}:`, error);
      throw error;
    }
  }

  /**
   * Gets prospect data from the database
   */
  private async getProspectData(prospectId: string): Promise<ProspectData> {
    try {
      const { data, error } = await this.supabase
        .from('prospects')
        .select('*')
        .eq('id', prospectId)
        .single();

      if (error) {
        console.error(`Error fetching prospect data for ${prospectId}:`, error);
        throw new Error(`Failed to fetch prospect data: ${error.message}`);
      }

      return data as ProspectData;
    } catch (error) {
      console.error(`Error in getProspectData for ${prospectId}:`, error);
      throw error;
    }
  }

  /**
   * Gets campaign data from the database
   */
  private async getCampaignData(campaignId: string): Promise<CampaignData> {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) {
        console.error(`Error fetching campaign data for ${campaignId}:`, error);
        throw new Error(`Failed to fetch campaign data: ${error.message}`);
      }

      return data as CampaignData;
    } catch (error) {
      console.error(`Error in getCampaignData for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Gets email template from the database
   */
  private async getEmailTemplate(templateId: string): Promise<EmailTemplate> {
    try {
      const { data, error } = await this.supabase
        .from('outreach_sequences')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        console.error(`Error fetching email template for ${templateId}:`, error);
        throw new Error(`Failed to fetch email template: ${error.message}`);
      }

      // Map the outreach sequence to an email template format
      return {
        id: data.id,
        name: `Step ${data.step_number} Template`,
        subject: this.extractSubjectFromTemplate(data.email_template),
        content: data.email_template,
        campaign_id: data.campaign_id,
        step_number: data.step_number
      };
    } catch (error) {
      console.error(`Error in getEmailTemplate for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Extracts the subject line from an email template
   * This is a simple implementation - in a real app you might have a more sophisticated approach
   */
  private extractSubjectFromTemplate(template: string): string {
    // Try to extract subject from template, assuming it might be marked with a prefix
    const subjectMatch = template.match(/Subject:\s*(.+)/i);
    if (subjectMatch) {
      return subjectMatch[1].trim();
    }
    
    // If no prefix found, return a default subject
    return 'AutoMeet Outreach';
  }

  /**
   * Personalizes an email template with prospect data
   */
  private async personalizeEmail(
    template: EmailTemplate,
    prospect: ProspectData,
    campaign: CampaignData
  ): Promise<EmailMessage> {
    try {
      // Replace placeholders in the template content
      let personalizedContent = template.content;
      let personalizedSubject = template.subject;

      // Define placeholders and their replacements
      const placeholders: Record<string, string> = {
        '{{prospect_name}}': prospect.contact_name || 'there',
        '{{prospect_first_name}}': prospect.contact_name ? prospect.contact_name.split(' ')[0] : 'there',
        '{{prospect_company}}': prospect.company_name || 'your company',
        '{{prospect_title}}': prospect.job_title || 'professional',
        '{{campaign_name}}': campaign.name,
        '{{user_name}}': await this.getUserName(campaign.user_id) // Get sender's name
      };

      // Replace content placeholders
      for (const [placeholder, value] of Object.entries(placeholders)) {
        personalizedContent = personalizedContent.replace(
          new RegExp(placeholder, 'g'),
          value
        );
      }

      // Replace subject placeholders
      for (const [placeholder, value] of Object.entries(placeholders)) {
        personalizedSubject = personalizedSubject.replace(
          new RegExp(placeholder, 'g'),
          value
        );
      }

      // Create the email message
      const emailMessage: EmailMessage = {
        to: prospect.email,
        subject: personalizedSubject,
        html: personalizedContent,
        text: this.htmlToText(personalizedContent) // Create plain text version
      };

      return emailMessage;
    } catch (error) {
      console.error('Error personalizing email:', error);
      throw error;
    }
  }

  /**
   * Gets the user's name for personalization
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      // This would typically fetch from an auth.users table or user_profiles table
      // For now, we'll return a placeholder
      const { data, error } = await this.supabase
        .from('users') // Assuming there's a users table
        .select('user_name, email')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // If we can't get the user's name, return a default
        return 'AutoMeet User';
      }

      return data.user_name || data.email?.split('@')[0] || 'AutoMeet User';
    } catch (error) {
      console.error(`Error getting user name for ${userId}:`, error);
      return 'AutoMeet User';
    }
  }

  /**
   * Converts HTML to plain text (simplified implementation)
   */
  private htmlToText(html: string): string {
    // Remove HTML tags and decode HTML entities
    return html
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Decode ampersand
      .replace(/&lt;/g, '<') // Decode less than
      .replace(/&gt;/g, '>') // Decode greater than
      .replace(/&quot;/g, '"') // Decode quotes
      .replace(/&#39;/g, "'") // Decode apostrophes
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  /**
   * Logs the email event in the database
   */
  private async logEmailEvent(prospectId: string, eventType: string, messageId: string, stepNumber: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('email_events')
        .insert({
          prospect_id: prospectId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          metadata: {
            message_id: messageId,
            step_number: stepNumber
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
   * Updates or creates an email thread record
   */
  private async updateEmailThread(
    prospectId: string,
    campaignId: string,
    messageId: string,
    subject: string
  ): Promise<void> {
    try {
      // Check if a thread already exists for this prospect and campaign
      const { data: existingThread, error } = await this.supabase
        .from('email_threads')
        .select('*')
        .eq('prospect_id', prospectId)
        .eq('campaign_id', campaignId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error(`Error checking for existing thread for prospect ${prospectId}:`, error);
        throw new Error(`Failed to check email thread: ${error.message}`);
      }

      if (existingThread) {
        // Update existing thread
        const { error: updateError } = await this.supabase
          .from('email_threads')
          .update({
            last_message_body: 'Email sent', // In a real implementation, you might store more details
            sent_at: new Date().toISOString(),
            reply_count: existingThread.reply_count + 1 // Increment the counter for tracking
          })
          .eq('id', existingThread.id);

        if (updateError) {
          console.error(`Error updating email thread for prospect ${prospectId}:`, updateError);
          throw new Error(`Failed to update email thread: ${updateError.message}`);
        }
      } else {
        // Create new thread
        const { error: insertError } = await this.supabase
          .from('email_threads')
          .insert({
            prospect_id: prospectId,
            campaign_id: campaignId,
            thread_id: `thread-${prospectId}`, // In a real implementation, this would be from Gmail
            subject: subject,
            last_message_body: 'Initial outreach email sent',
            sent_at: new Date().toISOString(),
            reply_count: 1,
            is_active: true
          });

        if (insertError) {
          console.error(`Error creating email thread for prospect ${prospectId}:`, insertError);
          throw new Error(`Failed to create email thread: ${insertError.message}`);
        }
      }
    } catch (error) {
      console.error(`Error in updateEmailThread for prospect ${prospectId}:`, error);
      throw error;
    }
  }

  /**
   * Generates a follow-up email based on previous interactions
   */
  async generateFollowUpEmail(
    userId: string,
    campaignId: string,
    prospectId: string,
    stepNumber: number
  ): Promise<string> {
    try {
      // Get the appropriate template for this step
      const { data: sequenceStep, error } = await this.supabase
        .from('outreach_sequences')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('step_number', stepNumber)
        .single();

      if (error) {
        console.error(`Error fetching follow-up template for campaign ${campaignId}, step ${stepNumber}:`, error);
        throw new Error(`Failed to fetch follow-up template: ${error.message}`);
      }

      if (!sequenceStep) {
        throw new Error(`No follow-up template found for campaign ${campaignId}, step ${stepNumber}`);
      }

      // Send the follow-up email using the template
      return await this.composeAndSendEmail(
        userId,
        campaignId,
        prospectId,
        sequenceStep.id,
        stepNumber
      );
    } catch (error) {
      console.error(`Error generating follow-up email for prospect ${prospectId}:`, error);
      throw error;
    }
  }
}

export default EmailComposer;