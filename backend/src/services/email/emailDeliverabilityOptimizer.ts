import { SupabaseClient } from '@supabase/supabase-js';

interface DeliverabilityHeaders {
  'X-Mailer'?: string;
  'X-Campaign-ID'?: string;
  'X-Prospect-ID'?: string;
  'List-Unsubscribe'?: string;
  'Precedence'?: string;
  'Auto-Submitted'?: string;
  'X-Priority'?: string;
  'Importance'?: string;
}

interface DeliverabilityMetrics {
  userId: string;
  domain: string;
  delivery_rate: number;
  bounce_rate: number;
  spam_rate: number;
  last_updated: Date;
}

class EmailDeliverabilityOptimizer {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Optimizes email headers for better deliverability
   */
  optimizeEmailHeaders(
    toEmail: string, 
    campaignId: string, 
    prospectId: string,
    customHeaders: Record<string, string> = {}
  ): DeliverabilityHeaders {
    // Extract domain from email address for tracking purposes
    const domain = toEmail.split('@')[1];
    
    // Build optimized headers
    const headers: DeliverabilityHeaders = {
      // Identify the mailer for transparency
      'X-Mailer': 'AutoMeet Email Outreach Platform',
      // Add campaign and prospect tracking IDs
      'X-Campaign-ID': campaignId,
      'X-Prospect-ID': prospectId,
      // Add unsubscribe header for compliance
      'List-Unsubscribe': `<mailto:unsubscribe@automeet.example.com?subject=Unsubscribe>`,
      // Mark as bulk mail appropriately
      'Precedence': 'bulk',
      // Indicate this is an auto-generated message
      'Auto-Submitted': 'auto-generated',
      // Set priority to normal to avoid spam filters
      'X-Priority': '3',
      'Importance': 'normal',
      ...customHeaders
    };

    return headers;
  }

  /**
   * Calculates and applies domain-specific deliverability settings
   */
  async getDomainSpecificSettings(toEmail: string): Promise<Record<string, string>> {
    try {
      const domain = toEmail.split('@')[1];
      
      // Query for any domain-specific deliverability metrics
      const { data, error } = await this.supabase
        .from('email_events')
        .select('metadata')
        .like('metadata->>recipient', `%${domain}%`)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .in('event_type', ['bounced', 'spam_reported', 'delivered']);

      if (error) {
        console.error(`Error getting domain metrics for ${domain}:`, error);
        // Return default settings if there's an error
        return {};
      }

      // Analyze domain performance and adjust settings accordingly
      if (data && data.length > 0) {
        const domainEvents = data;
        const bounceCount = domainEvents.filter(e => e.metadata?.event_type === 'bounced').length;
        const spamCount = domainEvents.filter(e => e.metadata?.event_type === 'spam_reported').length;
        const deliveryCount = domainEvents.filter(e => e.metadata?.event_type === 'delivered').length;
        
        const total = domainEvents.length;
        const bounceRate = total > 0 ? bounceCount / total : 0;
        const spamRate = total > 0 ? spamCount / total : 0;
        const deliveryRate = total > 0 ? deliveryCount / total : 0;

        // If the domain has high bounce/spam rates, add extra headers or modify behavior
        if (bounceRate > 0.1 || spamRate > 0.05) {
          return {
            'X-Warning-Level': 'caution', // Internal header to flag as needing extra caution
            'X-Verification-Needed': 'true'
          };
        }
      }

      return {};
    } catch (error) {
      console.error(`Error getting domain-specific settings for ${toEmail}:`, error);
      return {};
    }
  }

  /**
   * Enhances email content with deliverability improvements
   */
  optimizeEmailContent(
    subject: string,
    htmlContent: string,
    textContent?: string
  ): { subject: string; htmlContent: string; textContent?: string } {
    // Avoid spam trigger words in subject
    let optimizedSubject = this.removeSpamTriggerWords(subject);
    
    // Add important content early in the email to avoid being cut off
    // by spam filters that only scan the beginning
    const importantDisclaimer = `
      <div style="display:none; font-size:0; line-height:0; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all; visibility:hidden;">
        If you're having trouble reading this email, please view it in your browser.
        To ensure delivery to your inbox, please add our email address to your contacts.
      </div>
    `;
    
    // Add an image to trigger open tracking (if needed) - but be careful about this for deliverability
    let optimizedHtml = htmlContent;
    
    // Avoid spammy formatting
    optimizedHtml = this.removeSpammyFormatting(optimizedHtml);
    
    // Add a proper unsubscribe mechanism
    const unsubscribeFooter = `
      <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 12px; color: #666;">
        <p>If you no longer wish to receive these emails, <a href="mailto:unsubscribe@automeet.example.com?subject=Unsubscribe">unsubscribe here</a>.</p>
        <p>You received this email because you expressed interest in our services.</p>
      </div>
    `;
    
    optimizedHtml += importantDisclaimer + unsubscribeFooter;
    
    return {
      subject: optimizedSubject,
      htmlContent: optimizedHtml,
      textContent: textContent ? this.removeSpamTriggerWords(textContent) : textContent
    };
  }

  /**
   * Checks sender reputation and domain health
   */
  async checkSenderReputation(userId: string): Promise<boolean> {
    try {
      // Get recent email events for the user to assess reputation
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.supabase
        .from('email_events')
        .select('event_type')
        .eq('metadata->>user_id', userId)
        .gte('timestamp', twentyFourHoursAgo)
        .in('event_type', ['bounced', 'spam_reported', 'delivered', 'opened', 'replied']);

      if (error) {
        console.error(`Error checking sender reputation for user ${userId}:`, error);
        return true; // Default to positive if we can't check
      }

      if (!data || data.length === 0) {
        return true; // No data means no issues
      }

      const total = data.length;
      const bounceCount = data.filter(e => e.event_type === 'bounced').length;
      const spamCount = data.filter(e => e.event_type === 'spam_reported').length;
      
      const bounceRate = total > 0 ? bounceCount / total : 0;
      const spamRate = total > 0 ? spamCount / total : 0;
      
      // If bounce rate is above 5% or spam rate is above 3%, flag as concerning
      return bounceRate <= 0.05 && spamRate <= 0.03;
    } catch (error) {
      console.error(`Error checking sender reputation for user ${userId}:`, error);
      return true;
    }
  }

  /**
   * Updates deliverability metrics in the database
   */
  async updateDeliverabilityMetrics(
    userId: string,
    toEmail: string,
    eventType: 'delivered' | 'bounced' | 'spam_reported' | 'opened' | 'replied'
  ): Promise<void> {
    try {
      const domain = toEmail.split('@')[1];
      
      // Update or insert metrics for this user and domain
      // This is a simplified approach - in practice, you'd want to aggregate statistics properly
      await this.supabase
        .from('email_events')
        .insert({
          prospect_id: null, // This would be linked to a prospect ID in a real implementation
          event_type: eventType,
          timestamp: new Date().toISOString(),
          metadata: {
            user_id: userId,
            recipient_domain: domain,
            recipient: toEmail
          }
        });
      
      console.log(`Deliverability metric recorded for ${toEmail} (user: ${userId}): ${eventType}`);
    } catch (error) {
      console.error(`Error updating deliverability metrics for ${toEmail}:`, error);
    }
  }

  /**
   * Removes spam trigger words from content
   */
  private removeSpamTriggerWords(content: string): string {
    // Common spam trigger words and phrases to avoid
    const spamWords = [
      'free', 'act now', 'limited time', 'urgent', 'guarantee', 'click here', 
      'congratulations', 'winner', 'cash', 'prize', 'no obligation', 'risk free',
      'order now', 'while supplies last', 'amazing', 'incredible', 'miracle',
      'unlimited', '100% satisfaction', 'bargain', 'eliminate', 'inhibit',
      'miraculous', 'secret', 'sought after', 'try', 'order today', 'satisfaction guaranteed',
      'you have been chosen', 'all new', 'apply now', 'before you buy', 'buy direct',
      'call now', 'can we have a moment of your time', 'cheap', 'complete', 'complete satisfaction'
    ];

    let processedContent = content;
    for (const word of spamWords) {
      // Use regex for case-insensitive replacement
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processedContent = processedContent.replace(regex, `[${word}]`);
    }

    return processedContent;
  }

  /**
   * Removes spammy formatting from HTML content
   */
  private removeSpammyFormatting(htmlContent: string): string {
    // Remove excessive exclamation marks
    let processedContent = htmlContent.replace(/!{3,}/g, '!');

    // Remove excessive capitalization (all caps words longer than 3 characters)
    processedContent = processedContent.replace(/\b[A-Z]{4,}\b/g, (match) => {
      // Convert to title case or sentence case
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });

    // Remove excessive font sizes (larger than 16px for body content)
    // This is a simplified approach - more sophisticated processing would be needed for production
    processedContent = processedContent.replace(/font-size:\s*\d+px/gi, (match) => {
      const sizeMatch = match.match(/\d+/);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[0]);
        if (size > 20) {
          return 'font-size: 16px'; // Replace overly large fonts
        }
      }
      return match;
    });

    return processedContent;
  }

  /**
   * Gets recommendations for improving deliverability
   */
  async getDeliverabilityRecommendations(userId: string): Promise<string[]> {
    const recommendations: string[] = [];

    // Check recent activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase
      .from('email_events')
      .select('event_type')
      .eq('metadata->>user_id', userId)
      .gte('timestamp', sevenDaysAgo)
      .in('event_type', ['bounced', 'spam_reported', 'delivered']);

    if (error) {
      console.error(`Error getting deliverability data for user ${userId}:`, error);
      return [];
    }

    if (data) {
      const total = data.length;
      if (total > 0) {
        const bounceCount = data.filter(e => e.event_type === 'bounced').length;
        const spamCount = data.filter(e => e.event_type === 'spam_reported').length;
        
        const bounceRate = bounceCount / total;
        const spamRate = spamCount / total;
        
        if (bounceRate > 0.05) {
          recommendations.push(`High bounce rate detected (${(bounceRate * 100).toFixed(2)}%). Review email list for invalid addresses.`);
        }
        
        if (spamRate > 0.03) {
          recommendations.push(`High spam report rate detected (${(spamRate * 100).toFixed(2)}%). Review email content for spam triggers.`);
        }
        
        if (total < 100) {
          recommendations.push(`Low email volume detected. Consistent sending patterns help deliverability.`);
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("Your deliverability metrics look good! Keep following best practices.");
    }

    return recommendations;
  }
}

export default EmailDeliverabilityOptimizer;