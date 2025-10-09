import { SupabaseClient } from '@supabase/supabase-js';

interface CampaignStatusUpdate {
  id: string;
  status: string;
  updated_at: string;
}

/**
 * Tracks and updates campaign statuses based on various conditions
 */
export class CampaignStatusTracker {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Updates campaign state from scheduled to active automatically
   * when the scheduled_start_time is reached
   */
  async updateScheduledToActive(): Promise<void> {
    try {
      // Get current time
      const now = new Date().toISOString();
      
      // Find campaigns that should be activated (status is 'scheduled' and start time has passed)
      const { data: campaigns, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_start_time', now);

      if (error) {
        console.error('Error fetching scheduled campaigns for activation:', error);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        console.log('No campaigns need to be activated at this time.');
        return;
      }

      console.log(`Found ${campaigns.length} campaigns to activate.`);

      // Update each campaign status to 'active' and set started_at time
      for (const campaign of campaigns) {
        await this.activateCampaign(campaign.id);
      }
    } catch (error) {
      console.error('Error in updateScheduledToActive:', error);
      throw error;
    }
  }

  /**
   * Updates campaign status based on prospect engagement
   */
  async updateCampaignStatusByEngagement(): Promise<void> {
    try {
      // Get all active campaigns
      const { data: campaigns, error: campaignError } = await this.supabase
        .from('campaigns')
        .select('id')
        .eq('status', 'active');

      if (campaignError) {
        console.error('Error fetching active campaigns:', campaignError);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        return;
      }

      // For each active campaign, check if all prospects have been processed
      for (const campaign of campaigns) {
        await this.evaluateCampaignCompletion(campaign.id);
      }
    } catch (error) {
      console.error('Error in updateCampaignStatusByEngagement:', error);
      throw error;
    }
  }

  /**
   * Evaluates if a campaign should be marked as completed based on prospect engagement
   */
  private async evaluateCampaignCompletion(campaignId: string): Promise<void> {
    try {
      // Count prospects in the campaign
      const { count: totalProspects, error: countError } = await this.supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (countError) {
        console.error(`Error counting prospects for campaign ${campaignId}:`, countError);
        return;
      }

      if (totalProspects === 0) {
        // If no prospects, mark as completed
        await this.completeCampaign(campaignId);
        return;
      }

      // Count prospects that have reached final states (completed, or replied/engaged)
      const { count: completedProspects, error: completedCountError } = await this.supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .in('engagement_status', ['completed', 'meeting_scheduled']);

      if (completedCountError) {
        console.error(`Error counting completed prospects for campaign ${campaignId}:`, completedCountError);
        return;
      }

      // If all prospects are completed, mark the campaign as completed
      if (completedProspects === totalProspects) {
        await this.completeCampaign(campaignId);
        console.log(`Campaign ${campaignId} marked as completed - all prospects processed`);
      }
    } catch (error) {
      console.error(`Error evaluating campaign completion for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Activates a campaign by updating its status to 'active'
   */
  private async activateCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('campaigns')
        .update({
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) {
        console.error(`Error activating campaign ${campaignId}:`, error);
        throw new Error(`Failed to activate campaign: ${error.message}`);
      }

      console.log(`Campaign ${campaignId} activated successfully`);
    } catch (error) {
      console.error(`Error in activateCampaign for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Completes a campaign by updating its status to 'completed'
   */
  private async completeCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('campaigns')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) {
        console.error(`Error completing campaign ${campaignId}:`, error);
        throw new Error(`Failed to complete campaign: ${error.message}`);
      }

      console.log(`Campaign ${campaignId} completed successfully`);
    } catch (error) {
      console.error(`Error in completeCampaign for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Updates a campaign's status to paused if requested
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId)
        .in('status', ['active']); // Only allow pausing if currently active

      if (error) {
        console.error(`Error pausing campaign ${campaignId}:`, error);
        throw new Error(`Failed to pause campaign: ${error.message}`);
      }

      console.log(`Campaign ${campaignId} paused successfully`);
    } catch (error) {
      console.error(`Error in pauseCampaign for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId)
        .eq('status', 'paused');

      if (error) {
        console.error(`Error resuming campaign ${campaignId}:`, error);
        throw new Error(`Failed to resume campaign: ${error.message}`);
      }

      console.log(`Campaign ${campaignId} resumed successfully`);
    } catch (error) {
      console.error(`Error in resumeCampaign for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the current status of a campaign
   */
  async getCampaignStatus(campaignId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      if (error) {
        console.error(`Error fetching status for campaign ${campaignId}:`, error);
        throw new Error(`Failed to get campaign status: ${error.message}`);
      }

      return data.status;
    } catch (error) {
      console.error(`Error in getCampaignStatus for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Updates campaign metrics based on current status and engagement
   */
  async updateCampaignMetrics(campaignId: string): Promise<void> {
    try {
      // Calculate metrics: reply rate, meeting booking rate, etc.
      const replyRate = await this.calculateReplyRate(campaignId);
      const meetingRate = await this.calculateMeetingRate(campaignId);
      const engagementRate = await this.calculateEngagementRate(campaignId);

      // Update the campaign with the new metrics
      const { error } = await this.supabase
        .from('campaigns')
        .update({
          performance_metrics: {
            reply_rate: replyRate,
            meeting_booking_rate: meetingRate,
            engagement_rate: engagementRate,
            last_updated: new Date().toISOString()
          }
        })
        .eq('id', campaignId);

      if (error) {
        console.error(`Error updating metrics for campaign ${campaignId}:`, error);
        throw new Error(`Failed to update campaign metrics: ${error.message}`);
      }

      console.log(`Metrics updated for campaign ${campaignId}`);
    } catch (error) {
      console.error(`Error in updateCampaignMetrics for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Calculates the reply rate for a campaign
   */
  private async calculateReplyRate(campaignId: string): Promise<number> {
    try {
      // Count total prospects in the campaign
      const { count: totalProspects, error: totalError } = await this.supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (totalError) {
        console.error(`Error counting total prospects for campaign ${campaignId}:`, totalError);
        return 0;
      }

      if (totalProspects === 0) {
        return 0;
      }

      // Count prospects that have replied
      const { count: repliedProspects, error: repliedError } = await this.supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .in('engagement_status', ['replied', 'meeting_scheduled', 'completed']);

      if (repliedError) {
        console.error(`Error counting replied prospects for campaign ${campaignId}:`, repliedError);
        return 0;
      }

      return repliedProspects / totalProspects;
    } catch (error) {
      console.error(`Error calculating reply rate for campaign ${campaignId}:`, error);
      return 0;
    }
  }

  /**
   * Calculates the meeting booking rate for a campaign
   */
  private async calculateMeetingRate(campaignId: string): Promise<number> {
    try {
      // Count total prospects in the campaign
      const { count: totalProspects, error: totalError } = await this.supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (totalError) {
        console.error(`Error counting total prospects for campaign ${campaignId}:`, totalError);
        return 0;
      }

      if (totalProspects === 0) {
        return 0;
      }

      // Count prospects that have scheduled meetings
      const { count: meetingProspects, error: meetingError } = await this.supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .in('engagement_status', ['meeting_scheduled', 'completed']);

      if (meetingError) {
        console.error(`Error counting meeting prospects for campaign ${campaignId}:`, meetingError);
        return 0;
      }

      return meetingProspects / totalProspects;
    } catch (error) {
      console.error(`Error calculating meeting rate for campaign ${campaignId}:`, error);
      return 0;
    }
  }

  /**
   * Calculates the engagement rate for a campaign
   */
  private async calculateEngagementRate(campaignId: string): Promise<number> {
    try {
      // Count total prospects in the campaign
      const { count: totalProspects, error: totalError } = await this.supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (totalError) {
        console.error(`Error counting total prospects for campaign ${campaignId}:`, totalError);
        return 0;
      }

      if (totalProspects === 0) {
        return 0;
      }

      // Count prospects that have any engagement beyond initial contact
      const { count: engagedProspects, error: engagedError } = await this.supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .in('engagement_status', ['replied', 'meeting_scheduled', 'completed']);

      if (engagedError) {
        console.error(`Error counting engaged prospects for campaign ${campaignId}:`, engagedError);
        return 0;
      }

      return engagedProspects / totalProspects;
    } catch (error) {
      console.error(`Error calculating engagement rate for campaign ${campaignId}:`, error);
      return 0;
    }
  }
}