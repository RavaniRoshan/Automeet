import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

interface EngagementEvent {
  id: string;
  prospect_id: string;
  email_thread_id: string;
  event_type: 'opened' | 'clicked' | 'link_clicked' | 'attachment_opened';
  timestamp: Date;
  metadata: Record<string, any>;
}

interface EngagementTrackerConfig {
  trackingPixelEnabled: boolean;
  linkTrackingEnabled: boolean;
  customDomain?: string;
  pixelPath?: string;
}

class EmailEngagementTracker {
  private supabase: SupabaseClient;
  private config: EngagementTrackerConfig;

  constructor(supabaseClient: SupabaseClient, config?: Partial<EngagementTrackerConfig>) {
    this.supabase = supabaseClient;
    this.config = {
      trackingPixelEnabled: true,
      linkTrackingEnabled: true,
      customDomain: process.env.TRACKING_DOMAIN || 'track.automeet.example.com',
      pixelPath: '/pixel',
      ...config
    };
  }

  /**
   * Adds tracking pixel to email content
   */
  addTrackingPixel(htmlContent: string, eventId: string, prospectId: string, threadId: string): string {
    if (!this.config.trackingPixelEnabled) {
      return htmlContent;
    }

    // Create a unique tracking pixel URL
    const trackingUrl = this.getTrackingPixelUrl(eventId, prospectId, threadId);
    
    // Add the tracking pixel at the end of the email body
    const trackingPixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:none;" />`;
    
    // Insert the tracking pixel before the closing body tag, or at the end if no body tag
    if (htmlContent.toLowerCase().includes('</body>')) {
      return htmlContent.replace(/<\/body>/i, trackingPixel + '</body>');
    } else {
      return htmlContent + trackingPixel;
    }
  }

  /**
   * Replaces links in email content with tracked versions
   */
  addLinkTracking(htmlContent: string, eventId: string, prospectId: string, threadId: string): string {
    if (!this.config.linkTrackingEnabled) {
      return htmlContent;
    }

    // Regular expression to match href attributes in anchor tags
    const linkRegex = /href\s*=\s*["']([^"']+)["']/gi;
    
    return htmlContent.replace(linkRegex, (match, originalUrl) => {
      // Skip tracking for certain URLs (like unsubscribe links, etc.)
      if (this.shouldSkipTracking(originalUrl)) {
        return match;
      }

      // Create a tracked version of the URL
      const trackedUrl = this.getTrackedUrl(originalUrl, eventId, prospectId, threadId);
      return match.replace(originalUrl, trackedUrl);
    });
  }

  /**
   * Records an engagement event in the database
   */
  async recordEngagementEvent(
    prospectId: string,
    emailThreadId: string,
    eventType: 'opened' | 'clicked' | 'link_clicked' | 'attachment_opened',
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      // Generate a unique event ID
      const eventId = uuidv4();
      
      // Insert the engagement event into the database
      const { error } = await this.supabase
        .from('email_events')
        .insert({
          prospect_id: prospectId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          metadata: {
            email_thread_id: emailThreadId,
            ...metadata
          }
        });

      if (error) {
        console.error(`Error recording engagement event:`, error);
        throw error;
      }

      console.log(`Engagement event recorded: ${eventType} for prospect ${prospectId}`);
      return eventId;
    } catch (error) {
      console.error(`Error recording engagement event:`, error);
      throw error;
    }
  }

  /**
   * Processes a tracking pixel request
   */
  async processTrackingPixel(eventId: string, prospectId: string, threadId: string): Promise<void> {
    try {
      // Record the email open event
      await this.recordEngagementEvent(
        prospectId,
        threadId,
        'opened',
        { 
          source: 'tracking_pixel',
          event_id: eventId
        }
      );

      // Update the email thread with open information
      await this.updateEmailThreadEngagement(threadId, 'opened');
      
      console.log(`Tracking pixel processed for event ${eventId}, prospect ${prospectId}`);
    } catch (error) {
      console.error(`Error processing tracking pixel:`, error);
    }
  }

  /**
   * Processes a tracked link click
   */
  async processLinkClick(eventId: string, prospectId: string, threadId: string, originalUrl: string): Promise<string> {
    try {
      // Record the link click event
      await this.recordEngagementEvent(
        prospectId,
        threadId,
        'link_clicked',
        {
          source: 'tracked_link',
          event_id: eventId,
          original_url: originalUrl
        }
      );

      // Update the email thread with click information
      await this.updateEmailThreadEngagement(threadId, 'clicked');
      
      console.log(`Link click processed for event ${eventId}, prospect ${prospectId}, URL: ${originalUrl}`);
      
      // Return the original URL to redirect the user to
      return originalUrl;
    } catch (error) {
      console.error(`Error processing link click:`, error);
      // If there's an error, still return the original URL so the user isn't blocked
      return originalUrl;
    }
  }

  /**
   * Gets engagement metrics for a prospect
   */
  async getProspectEngagementMetrics(prospectId: string): Promise<Record<string, number>> {
    try {
      // Get all engagement events for this prospect
      const { data, error } = await this.supabase
        .from('email_events')
        .select('event_type')
        .eq('prospect_id', prospectId)
        .in('event_type', ['opened', 'clicked', 'link_clicked', 'replied']);

      if (error) {
        console.error(`Error getting engagement metrics for prospect ${prospectId}:`, error);
        return {
          opens: 0,
          clicks: 0,
          replies: 0,
          total_emails: 0
        };
      }

      if (!data) {
        return {
          opens: 0,
          clicks: 0,
          replies: 0,
          total_emails: 0
        };
      }

      // Count different types of engagement
      const opens = data.filter(e => e.event_type === 'opened').length;
      const clicks = data.filter(e => e.event_type === 'clicked' || e.event_type === 'link_clicked').length;
      const replies = data.filter(e => e.event_type === 'replied').length;

      // Get total emails sent to this prospect
      const { count: totalEmails, error: countError } = await this.supabase
        .from('email_events')
        .select('*', { count: 'exact', head: true })
        .eq('prospect_id', prospectId)
        .eq('event_type', 'sent');

      if (countError) {
        console.error(`Error getting total email count for prospect ${prospectId}:`, countError);
      }

      return {
        opens,
        clicks,
        replies,
        total_emails: totalEmails || 0
      };
    } catch (error) {
      console.error(`Error getting engagement metrics for prospect ${prospectId}:`, error);
      return {
        opens: 0,
        clicks: 0,
        replies: 0,
        total_emails: 0
      };
    }
  }

  /**
   * Gets engagement metrics for a campaign
   */
  async getCampaignEngagementMetrics(campaignId: string): Promise<Record<string, number>> {
    try {
      // First, get all prospects in the campaign
      const { data: prospects, error: prospectsError } = await this.supabase
        .from('prospects')
        .select('id')
        .eq('campaign_id', campaignId);

      if (prospectsError) {
        console.error(`Error getting prospects for campaign ${campaignId}:`, prospectsError);
        return {
          unique_opens: 0,
          unique_clicks: 0,
          total_opens: 0,
          total_clicks: 0,
          reply_count: 0,
          open_rate: 0,
          click_rate: 0
        };
      }

      if (!prospects || prospects.length === 0) {
        return {
          unique_opens: 0,
          unique_clicks: 0,
          total_opens: 0,
          total_clicks: 0,
          reply_count: 0,
          open_rate: 0,
          click_rate: 0
        };
      }

      const prospectIds = prospects.map(p => p.id);
      
      // Get all engagement events for prospects in this campaign
      const { data, error } = await this.supabase
        .from('email_events')
        .select('event_type, prospect_id')
        .in('prospect_id', prospectIds)
        .in('event_type', ['opened', 'clicked', 'link_clicked', 'replied']);

      if (error) {
        console.error(`Error getting campaign engagement metrics for campaign ${campaignId}:`, error);
        return {
          unique_opens: 0,
          unique_clicks: 0,
          total_opens: 0,
          total_clicks: 0,
          reply_count: 0,
          open_rate: 0,
          click_rate: 0
        };
      }

      if (!data) {
        return {
          unique_opens: 0,
          unique_clicks: 0,
          total_opens: 0,
          total_clicks: 0,
          reply_count: 0,
          open_rate: 0,
          click_rate: 0
        };
      }

      // Count engagement events
      const uniqueProspectsOpened = new Set(data.filter(e => e.event_type === 'opened').map(e => e.prospect_id)).size;
      const uniqueProspectsClicked = new Set(data.filter(e => e.event_type === 'clicked' || e.event_type === 'link_clicked').map(e => e.prospect_id)).size;
      const totalOpens = data.filter(e => e.event_type === 'opened').length;
      const totalClicks = data.filter(e => e.event_type === 'clicked' || e.event_type === 'link_clicked').length;
      const replyCount = data.filter(e => e.event_type === 'replied').length;

      const openRate = prospectIds.length > 0 ? (uniqueProspectsOpened / prospectIds.length) * 100 : 0;
      const clickRate = uniqueProspectsOpened > 0 ? (uniqueProspectsClicked / uniqueProspectsOpened) * 100 : 0;

      return {
        unique_opens: uniqueProspectsOpened,
        unique_clicks: uniqueProspectsClicked,
        total_opens: totalOpens,
        total_clicks: totalClicks,
        reply_count: replyCount,
        open_rate: parseFloat(openRate.toFixed(2)),
        click_rate: parseFloat(clickRate.toFixed(2))
      };
    } catch (error) {
      console.error(`Error getting campaign engagement metrics for campaign ${campaignId}:`, error);
      return {
        unique_opens: 0,
        unique_clicks: 0,
        total_opens: 0,
        total_clicks: 0,
        reply_count: 0,
        open_rate: 0,
        click_rate: 0
      };
    }
  }

  /**
   * Gets the tracking pixel URL
   */
  private getTrackingPixelUrl(eventId: string, prospectId: string, threadId: string): string {
    const encodedParams = `event=${encodeURIComponent(eventId)}&prospect=${encodeURIComponent(prospectId)}&thread=${encodeURIComponent(threadId)}`;
    return `https://${this.config.customDomain}${this.config.pixelPath}?${encodedParams}`;
  }

  /**
   * Gets a tracked URL for link tracking
   */
  private getTrackedUrl(originalUrl: string, eventId: string, prospectId: string, threadId: string): string {
    // Use the tracking domain to create a redirect URL
    const encodedParams = `event=${encodeURIComponent(eventId)}&prospect=${encodeURIComponent(prospectId)}&thread=${encodeURIComponent(threadId)}&url=${encodeURIComponent(originalUrl)}`;
    return `https://${this.config.customDomain}/click?${encodedParams}`;
  }

  /**
   * Determines if a URL should be skipped for tracking
   */
  private shouldSkipTracking(url: string): boolean {
    // Skip tracking for mailto links, tel links, and internal application links
    return (
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.startsWith('sms:') ||
      // Skip unsubscribe links
      url.includes('unsubscribe') ||
      url.includes('optout') ||
      // Skip links to tracking domain (to avoid infinite loops)
      url.includes(this.config.customDomain || '')
    );
  }

  /**
   * Updates email thread with engagement information
   */
  private async updateEmailThreadEngagement(threadId: string, engagementType: string): Promise<void> {
    try {
      // Update the email thread with the latest engagement information
      const { error } = await this.supabase
        .from('email_threads')
        .update({
          last_engagement_at: new Date().toISOString(),
          engagement_metrics: this.supabase.rpc('update_engagement_metrics', { 
            thread_id: threadId, 
            engagement_type: engagementType 
          }),
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId);

      if (error) {
        console.error(`Error updating engagement for thread ${threadId}:`, error);
        // This is not a critical error, so we don't throw
      }
    } catch (error) {
      console.error(`Unexpected error updating engagement for thread ${threadId}:`, error);
    }
  }

  /**
   * Generates engagement summary for reporting
   */
  async generateEngagementReport(campaignId: string): Promise<any> {
    try {
      const campaignMetrics = await this.getCampaignEngagementMetrics(campaignId);
      
      // Get additional metrics
      const { data: campaignData, error: campaignError } = await this.supabase
        .from('campaigns')
        .select('start_date, end_date, name')
        .eq('id', campaignId)
        .single();

      if (campaignError) {
        console.error(`Error getting campaign data for ${campaignId}:`, campaignError);
        throw campaignError;
      }

      // Calculate additional metrics
      const duration = campaignData.end_date ? 
        (new Date(campaignData.end_date).getTime() - new Date(campaignData.start_date).getTime()) / (1000 * 60 * 60 * 24) : 
        (Date.now() - new Date(campaignData.start_date).getTime()) / (1000 * 60 * 60 * 24);

      const report = {
        campaign_name: campaignData.name,
        duration_days: Math.round(duration),
        metrics: campaignMetrics,
        generated_at: new Date().toISOString()
      };

      return report;
    } catch (error) {
      console.error(`Error generating engagement report for campaign ${campaignId}:`, error);
      throw error;
    }
  }
}

export default EmailEngagementTracker;