import { SupabaseClient } from '@supabase/supabase-js';
import { sendCampaignStartNotification } from '../services/notificationService';
import { activateCampaign } from '../services/campaignService';

interface Campaign {
  id: string;
  user_id: string;
  name: string;
  scheduled_start_time: string;
  status: string;
  notification_sent: boolean;
}

class CampaignScheduler {
  private supabase: SupabaseClient;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Starts the campaign scheduler to check for campaigns that need to be activated
   * Runs every hour to identify campaigns with scheduled_start_time approaching
   */
  start(): void {
    // Run immediately when starting
    this.checkForScheduledCampaigns();
    
    // Then run every hour (3600000 ms)
    this.intervalId = setInterval(() => {
      this.checkForScheduledCampaigns();
    }, 3600000);
    
    console.log('Campaign scheduler started. Checking for scheduled campaigns every hour.');
  }

  /**
   * Stops the campaign scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Campaign scheduler stopped.');
    }
  }

  /**
   * Checks for campaigns that have scheduled_start_time approaching
   * Monitors campaigns with scheduled_start_time within the next hour
   */
  async checkForScheduledCampaigns(): Promise<void> {
    try {
      console.log('Checking for scheduled campaigns...');
      
      // Get current time and add 1 hour to it
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour in milliseconds
      
      // Format dates to ISO strings for Supabase query
      const nowStr = now.toISOString();
      const oneHourFromNowStr = oneHourFromNow.toISOString();
      
      // Query for campaigns that are scheduled to start soon
      const { data: campaigns, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_start_time', nowStr)
        .lte('scheduled_start_time', oneHourFromNowStr);

      if (error) {
        console.error('Error fetching scheduled campaigns:', error);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        console.log('No campaigns scheduled to start soon.');
        return;
      }

      console.log(`Found ${campaigns.length} campaigns scheduled to start soon.`);

      // Process each campaign that's approaching its scheduled start time
      for (const campaign of campaigns) {
        await this.processScheduledCampaign(campaign);
      }
    } catch (error) {
      console.error('Error in checkForScheduledCampaigns:', error);
    }
  }

  /**
   * Processes a scheduled campaign based on its time to activation
   */
  private async processScheduledCampaign(campaign: Campaign): Promise<void> {
    try {
      const scheduledTime = new Date(campaign.scheduled_start_time);
      const now = new Date();
      const timeUntilStartMs = scheduledTime.getTime() - now.getTime();
      const timeUntilStartHours = timeUntilStartMs / (1000 * 60 * 60);

      // If the campaign is within 1 hour of starting, check if we need to send a notification
      if (timeUntilStartHours <= 1 && !campaign.notification_sent) {
        console.log(`Campaign ${campaign.id} starting soon. Sending notification to user ${campaign.user_id}`);
        await this.sendStartNotification(campaign);
      }

      // If the scheduled time has passed or is within 5 minutes, activate the campaign
      if (timeUntilStartMs <= 5 * 60 * 1000) { // Within 5 minutes
        console.log(`Activating campaign ${campaign.id} scheduled for ${campaign.scheduled_start_time}`);
        await this.activateScheduledCampaign(campaign);
      }
    } catch (error) {
      console.error(`Error processing scheduled campaign ${campaign.id}:`, error);
    }
  }

  /**
   * Sends a notification to the user about the upcoming campaign start
   */
  private async sendStartNotification(campaign: Campaign): Promise<void> {
    try {
      await sendCampaignStartNotification(campaign);
      
      // Update the campaign to mark that notification was sent
      const { error } = await this.supabase
        .from('campaigns')
        .update({ notification_sent: true })
        .eq('id', campaign.id);

      if (error) {
        console.error(`Error updating notification_sent for campaign ${campaign.id}:`, error);
      } else {
        console.log(`Notification sent and marked for campaign ${campaign.id}`);
      }
    } catch (error) {
      console.error(`Error sending start notification for campaign ${campaign.id}:`, error);
    }
  }

  /**
   * Activates a scheduled campaign by changing its status to 'active'
   */
  private async activateScheduledCampaign(campaign: Campaign): Promise<void> {
    try {
      await activateCampaign(campaign.id);
      console.log(`Campaign ${campaign.id} activated successfully`);
    } catch (error) {
      console.error(`Error activating campaign ${campaign.id}:`, error);
    }
  }
}

export default CampaignScheduler;