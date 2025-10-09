import { SupabaseClient } from '@supabase/supabase-js';
import EmailComposer from './emailComposer';
import { ProspectData } from './emailComposer';

interface OutreachSequence {
  id: string;
  campaign_id: string;
  step_number: number;
  delay_days: number;
  email_template: string;
  trigger_condition: any; // JSON condition
  is_active: boolean;
}

interface CampaignProgress {
  campaign_id: string;
  prospect_id: string;
  current_step: number;
  last_sent_at: string;
  next_scheduled_at: string;
}

class EmailSequenceExecutor {
  private supabase: SupabaseClient;
  private emailComposer: EmailComposer;

  constructor(supabaseClient: SupabaseClient, emailComposer: EmailComposer) {
    this.supabase = supabaseClient;
    this.emailComposer = emailComposer;
  }

  /**
   * Executes email sequences based on timing rules
   */
  async executeSequences(): Promise<void> {
    try {
      console.log('Executing scheduled email sequences...');

      // Get all active campaigns that are currently running
      const { data: campaigns, error: campaignError } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active');

      if (campaignError) {
        console.error('Error fetching active campaigns:', campaignError);
        throw new Error(`Failed to fetch active campaigns: ${campaignError.message}`);
      }

      if (!campaigns || campaigns.length === 0) {
        console.log('No active campaigns to process.');
        return;
      }

      // Process each active campaign
      for (const campaign of campaigns) {
        await this.processCampaignSequences(campaign.id);
      }

      console.log('Completed processing email sequences.');
    } catch (error) {
      console.error('Error in executeSequences:', error);
      throw error;
    }
  }

  /**
   * Processes sequences for a specific campaign
   */
  private async processCampaignSequences(campaignId: string): Promise<void> {
    try {
      console.log(`Processing sequences for campaign ${campaignId}...`);

      // Get all prospects in this campaign
      const { data: prospects, error: prospectsError } = await this.supabase
        .from('prospects')
        .select('*')
        .eq('campaign_id', campaignId);

      if (prospectsError) {
        console.error(`Error fetching prospects for campaign ${campaignId}:`, prospectsError);
        throw new Error(`Failed to fetch prospects: ${prospectsError.message}`);
      }

      if (!prospects || prospects.length === 0) {
        console.log(`No prospects found in campaign ${campaignId}`);
        return;
      }

      // Get the outreach sequences for this campaign
      const sequences = await this.getOutreachSequences(campaignId);

      for (const prospect of prospects) {
        await this.processProspectSequences(campaignId, prospect, sequences);
      }
    } catch (error) {
      console.error(`Error processing sequences for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Processes sequences for a specific prospect
   */
  private async processProspectSequences(
    campaignId: string,
    prospect: any,
    sequences: OutreachSequence[]
  ): Promise<void> {
    try {
      // Get the current progress for this prospect in the campaign
      const progress = await this.getCurrentProgress(campaignId, prospect.id);
      
      // Determine which step should be sent next
      const nextStep = await this.getNextAvailableStep(campaignId, prospect.id, progress, sequences);

      if (!nextStep) {
        return; // No next step to send
      }

      // Check if the delay period has passed
      const shouldSend = await this.shouldSendNextStep(campaignId, prospect.id, nextStep, progress);

      if (shouldSend) {
        // Send the email
        await this.emailComposer.composeAndSendEmail(
          await this.getUserIdFromCampaign(campaignId),
          campaignId,
          prospect.id,
          nextStep.id,
          nextStep.step_number
        );

        // Update the progress
        await this.updateProgress(campaignId, prospect.id, nextStep);
      }
    } catch (error) {
      console.error(`Error processing sequences for prospect ${prospect.id} in campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Gets active outreach sequences for a campaign
   */
  private async getOutreachSequences(campaignId: string): Promise<OutreachSequence[]> {
    try {
      const { data, error } = await this.supabase
        .from('outreach_sequences')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('step_number', { ascending: true });

      if (error) {
        console.error(`Error fetching sequences for campaign ${campaignId}:`, error);
        throw new Error(`Failed to fetch sequences: ${error.message}`);
      }

      return data as OutreachSequence[];
    } catch (error) {
      console.error(`Error in getOutreachSequences for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the current progress for a prospect in a campaign
   */
  private async getCurrentProgress(campaignId: string, prospectId: string): Promise<CampaignProgress | null> {
    try {
      const { data, error } = await this.supabase
        .from('campaign_progress') // Assuming we have a campaign_progress table
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('prospect_id', prospectId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error(`Error fetching progress for prospect ${prospectId}:`, error);
        throw new Error(`Failed to fetch progress: ${error.message}`);
      }

      return data as CampaignProgress;
    } catch (error) {
      console.error(`Error in getCurrentProgress for prospect ${prospectId}:`, error);
      throw error;
    }
  }

  /**
   * Creates or updates progress record for a prospect
   */
  private async updateProgress(campaignId: string, prospectId: string, sequenceStep: OutreachSequence): Promise<void> {
    try {
      const now = new Date().toISOString();
      const nextScheduledTime = new Date();
      nextScheduledTime.setDate(nextScheduledTime.getDate() + sequenceStep.delay_days);
      
      // Check if a progress record exists
      const { data: existingProgress, error } = await this.supabase
        .from('campaign_progress')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('prospect_id', prospectId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error(`Error checking progress for prospect ${prospectId}:`, error);
        throw new Error(`Failed to check progress: ${error.message}`);
      }

      if (existingProgress) {
        // Update existing progress
        const { error: updateError } = await this.supabase
          .from('campaign_progress')
          .update({
            current_step: sequenceStep.step_number,
            last_sent_at: now,
            next_scheduled_at: nextScheduledTime.toISOString(),
            updated_at: now
          })
          .eq('campaign_id', campaignId)
          .eq('prospect_id', prospectId);

        if (updateError) {
          console.error(`Error updating progress for prospect ${prospectId}:`, updateError);
          throw new Error(`Failed to update progress: ${updateError.message}`);
        }
      } else {
        // Create new progress record
        const { error: insertError } = await this.supabase
          .from('campaign_progress')
          .insert({
            campaign_id: campaignId,
            prospect_id: prospectId,
            current_step: sequenceStep.step_number,
            last_sent_at: now,
            next_scheduled_at: nextScheduledTime.toISOString()
          });

        if (insertError) {
          console.error(`Error inserting progress for prospect ${prospectId}:`, insertError);
          throw new Error(`Failed to insert progress: ${insertError.message}`);
        }
      }

      console.log(`Progress updated for prospect ${prospectId}, step ${sequenceStep.step_number}`);
    } catch (error) {
      console.error(`Error in updateProgress for prospect ${prospectId}:`, error);
      throw error;
    }
  }

  /**
   * Determines if the next step should be sent based on timing and conditions
   */
  private async shouldSendNextStep(
    campaignId: string,
    prospectId: string,
    nextStep: OutreachSequence,
    progress: CampaignProgress | null
  ): Promise<boolean> {
    try {
      // Check if we have progress data
      if (!progress) {
        // If no progress, this is the first step - check if delay is 0
        return nextStep.step_number === 1 && nextStep.delay_days === 0;
      }

      // Check if the delay period has passed since the last email was sent
      const lastSentDate = new Date(progress.last_sent_at);
      const requiredDelayMs = nextStep.delay_days * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      const now = new Date();

      if (now.getTime() - lastSentDate.getTime() < requiredDelayMs) {
        // Delay hasn't passed yet
        return false;
      }

      // Check if the current step in progress matches the expected step
      if (progress.current_step + 1 !== nextStep.step_number) {
        // This isn't the next expected step
        return false;
      }

      // Check trigger conditions if any
      if (nextStep.trigger_condition && Object.keys(nextStep.trigger_condition).length > 0) {
        return await this.evaluateTriggerCondition(prospectId, nextStep.trigger_condition);
      }

      return true;
    } catch (error) {
      console.error(`Error checking if next step should be sent for prospect ${prospectId}:`, error);
      return false; // Default to not sending if there's an error
    }
  }

  /**
   * Evaluates trigger conditions for a sequence step
   */
  private async evaluateTriggerCondition(prospectId: string, condition: any): Promise<boolean> {
    try {
      // Example: Check if prospect has replied to previous emails
      if (condition.type === 'prospect_replied' && condition.value === true) {
        const { data: prospect, error } = await this.supabase
          .from('prospects')
          .select('engagement_status')
          .eq('id', prospectId)
          .single();

        if (error) {
          console.error(`Error fetching prospect ${prospectId}:`, error);
          return false;
        }

        return prospect.engagement_status === 'replied';
      }

      // Example: Check if previous step was opened
      if (condition.type === 'previous_opened' && condition.value === true) {
        // This would check email_events for open events
        const { data: emailEvents, error } = await this.supabase
          .from('email_events')
          .select('*')
          .eq('prospect_id', prospectId)
          .eq('event_type', 'opened')
          .gt('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Within last 7 days

        if (error) {
          console.error(`Error checking email events for prospect ${prospectId}:`, error);
          return false;
        }

        return emailEvents.length > 0;
      }

      // For now, return true if no specific conditions are defined
      return true;
    } catch (error) {
      console.error(`Error evaluating trigger condition for prospect ${prospectId}:`, error);
      return false;
    }
  }

  /**
   * Determines the next available step for a prospect
   */
  private async getNextAvailableStep(
    campaignId: string,
    prospectId: string,
    progress: CampaignProgress | null,
    sequences: OutreachSequence[]
  ): OutreachSequence | null {
    try {
      const currentStep = progress ? progress.current_step : 0;

      // Find the next sequence step that should be sent
      for (const sequence of sequences) {
        // Skip if it's not the next step in sequence
        if (sequence.step_number !== currentStep + 1) {
          continue;
        }

        // Check if any trigger conditions are met
        if (sequence.trigger_condition && Object.keys(sequence.trigger_condition).length > 0) {
          const conditionMet = await this.evaluateTriggerCondition(prospectId, sequence.trigger_condition);
          if (!conditionMet) {
            continue; // Skip this step if conditions aren't met
          }
        }

        // Check the prospect's engagement status to determine if this step is still relevant
        const { data: prospect, error } = await this.supabase
          .from('prospects')
          .select('engagement_status')
          .eq('id', prospectId)
          .single();

        if (error) {
          console.error(`Error fetching prospect ${prospectId}:`, error);
          continue;
        }

        // If the prospect has already scheduled a meeting, stop sending follow-ups
        if (prospect.engagement_status === 'meeting_scheduled' || prospect.engagement_status === 'completed') {
          return null;
        }

        return sequence;
      }

      return null; // No more steps to send
    } catch (error) {
      console.error(`Error determining next step for prospect ${prospectId}:`, error);
      return null;
    }
  }

  /**
   * Gets user ID from campaign
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
   * Skips a sequence step for a prospect (e.g., if they replied)
   */
  async skipToNextStep(campaignId: string, prospectId: string): Promise<void> {
    try {
      // Get current progress
      const progress = await this.getCurrentProgress(campaignId, prospectId);

      if (!progress) {
        console.log(`No progress recorded for prospect ${prospectId}, nothing to skip`);
        return;
      }

      // Update the progress to advance
      const now = new Date().toISOString();
      const { error } = await this.supabase
        .from('campaign_progress')
        .update({
          current_step: progress.current_step + 1,
          last_sent_at: now,
          updated_at: now
        })
        .eq('campaign_id', campaignId)
        .eq('prospect_id', prospectId);

      if (error) {
        console.error(`Error skipping step for prospect ${prospectId}:`, error);
        throw new Error(`Failed to skip step: ${error.message}`);
      }

      console.log(`Skipped step for prospect ${prospectId}, now at step ${progress.current_step + 1}`);
    } catch (error) {
      console.error(`Error in skipToNextStep for prospect ${prospectId}:`, error);
      throw error;
    }
  }

  /**
   * Resumes a paused sequence for a prospect
   */
  async resumeSequence(campaignId: string, prospectId: string): Promise<void> {
    try {
      // Get the current progress
      const progress = await this.getCurrentProgress(campaignId, prospectId);

      if (!progress) {
        console.log(`No progress recorded for prospect ${prospectId}, nothing to resume`);
        return;
      }

      // Update the prospect's engagement status to continue sequence
      const { error } = await this.supabase
        .from('prospects')
        .update({ engagement_status: 'contacted' })
        .eq('id', prospectId);

      if (error) {
        console.error(`Error updating engagement status for prospect ${prospectId}:`, error);
        throw new Error(`Failed to resume sequence: ${error.message}`);
      }

      console.log(`Resumed sequence for prospect ${prospectId}`);
    } catch (error) {
      console.error(`Error in resumeSequence for prospect ${prospectId}:`, error);
      throw error;
    }
  }
}

export default EmailSequenceExecutor;