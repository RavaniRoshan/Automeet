import { SupabaseClient } from '@supabase/supabase-js';

interface RateLimitInfo {
  userId: string;
  emailsSent: number;
  resetTime: Date;
  dailyLimit: number;
}

interface DailyEmailUsage {
  user_id: string;
  date: string; // Format: YYYY-MM-DD
  emails_sent: number;
  created_at: string;
  updated_at: string;
}

class EmailRateLimiter {
  private supabase: SupabaseClient;
  private dailyLimit: number;
  private readonly: Map<string, RateLimitInfo>;

  constructor(supabaseClient: SupabaseClient, dailyLimit: number = 400) { // Gmail's default daily limit is 500
    this.supabase = supabaseClient;
    this.dailyLimit = dailyLimit;
    this.readonly = new Map<string, RateLimitInfo>();
  }

  /**
   * Checks if a user is allowed to send an email
   */
  async canSendEmail(userId: string): Promise<boolean> {
    try {
      const rateLimitInfo = await this.getRateLimitInfo(userId);
      const now = new Date();
      
      // If we've passed the reset time, reset the count
      if (now >= rateLimitInfo.resetTime) {
        await this.resetDailyCount(userId);
        return true; // Reset and allow sending
      }
      
      // Check if the user has reached their daily limit
      return rateLimitInfo.emailsSent < rateLimitInfo.dailyLimit;
    } catch (error) {
      console.error(`Error checking rate limit for user ${userId}:`, error);
      // In case of error, default to allowing the email with caution
      return true;
    }
  }

  /**
   * Records that a user has sent an email
   */
  async recordEmailSent(userId: string): Promise<boolean> {
    try {
      // First, check if the user can send an email
      if (!await this.canSendEmail(userId)) {
        console.log(`Rate limit exceeded for user ${userId}`);
        return false;
      }

      // Get today's date string in YYYY-MM-DD format
      const today = this.getTodayString();
      
      // Try to update existing record for today
      const { error: updateError } = await this.supabase
        .from('user_calendar_settings') // Assuming this table can hold rate limiting info
        .update({
          daily_emails_sent: this.supabase.rpc('increment_daily_emails', { user_id: userId }),
          last_email_sent_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      // If update failed because record doesn't exist, create one
      if (updateError) {
        // Try to insert a new record
        const { error: insertError } = await this.supabase
          .from('user_calendar_settings')
          .insert({
            user_id: userId,
            daily_emails_sent: 1,
            last_email_sent_at: new Date().toISOString()
          });

        if (insertError && insertError.message.includes('duplicate key')) {
          // If we get a duplicate key error, try updating again
          const { error: retryUpdateError } = await this.supabase
            .from('user_calendar_settings')
            .update({
              daily_emails_sent: this.supabase.rpc('increment_daily_emails', { user_id: userId }),
              last_email_sent_at: new Date().toISOString()
            })
            .eq('user_id', userId);
            
          if (retryUpdateError) {
            console.error(`Error recording email sent for user ${userId}:`, retryUpdateError);
            return false;
          }
        } else if (insertError) {
          console.error(`Error recording email sent for user ${userId}:`, insertError);
          return false;
        }
      }

      // Update the in-memory cache
      if (this.readonly.has(userId)) {
        const info = this.readonly.get(userId)!;
        info.emailsSent += 1;
        this.readonly.set(userId, info);
      }

      console.log(`Email recorded for user ${userId}, total today: ${await this.getTodaysEmailCount(userId)}`);
      return true;
    } catch (error) {
      console.error(`Error recording email sent for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Gets rate limit information for a user
   */
  async getRateLimitInfo(userId: string): Promise<RateLimitInfo> {
    // Check if we have the info in memory cache
    if (this.readonly.has(userId)) {
      const info = this.readonly.get(userId)!;
      const now = new Date();
      
      // Check if the cache is still valid
      if (now < info.resetTime) {
        return info;
      }
    }

    // Get the user's daily email count from the database
    const emailsSent = await this.getTodaysEmailCount(userId);
    const resetTime = this.getNextResetTime();
    const rateLimitInfo = {
      userId,
      emailsSent,
      resetTime,
      dailyLimit: this.dailyLimit
    };

    this.readonly.set(userId, rateLimitInfo);
    return rateLimitInfo;
  }

  /**
   * Gets today's email count for a user
   */
  private async getTodaysEmailCount(userId: string): Promise<number> {
    try {
      // Query email events for today
      const todayStart = this.getTodayStart();
      const tomorrowStart = this.getTomorrowStart();
      
      // Get from user_calendar_settings table (assuming this table has daily_emails_sent column)
      const { data, error } = await this.supabase
        .from('user_calendar_settings')
        .select('daily_emails_sent')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn(`No rate limit record found for user ${userId}, creating new one:`, error);
        // Create a new record with 0 emails sent if none exists
        await this.supabase
          .from('user_calendar_settings')
          .insert({
            user_id: userId,
            daily_emails_sent: 0,
            last_email_sent_at: new Date().toISOString()
          });
        return 0;
      }

      return data.daily_emails_sent || 0;
    } catch (error) {
      console.error(`Error getting today's email count for user ${userId}:`, error);
      return 0; // Default to 0 if there's an error
    }
  }

  /**
   * Resets the daily count for a user
   */
  async resetDailyCount(userId: string): Promise<void> {
    try {
      // Update the user's daily email count to 0
      const { error } = await this.supabase
        .from('user_calendar_settings')
        .update({
          daily_emails_sent: 0,
          last_email_sent_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        // If the record doesn't exist, create one
        if (error.message.includes('not found')) {
          const { error: insertError } = await this.supabase
            .from('user_calendar_settings')
            .insert({
              user_id: userId,
              daily_emails_sent: 0,
              last_email_sent_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error(`Error creating rate limit record for user ${userId}:`, insertError);
            throw insertError;
          }
        } else {
          console.error(`Error resetting daily count for user ${userId}:`, error);
          throw error;
        }
      }

      // Update the cache
      const resetTime = this.getNextResetTime();
      this.readonly.set(userId, {
        userId,
        emailsSent: 0,
        resetTime,
        dailyLimit: this.dailyLimit
      });

      console.log(`Daily count reset for user ${userId}`);
    } catch (error) {
      console.error(`Error resetting daily count for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the start of today (00:00:00)
   */
  private getTodayStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Gets the start of tomorrow (00:00:00)
   */
  private getTomorrowStart(): Date {
    const todayStart = this.getTodayStart();
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  /**
   * Gets today's date as a string (YYYY-MM-DD)
   */
  private getTodayString(): string {
    const today = this.getTodayStart();
    return today.toISOString().split('T')[0];
  }

  /**
   * Gets the next reset time (start of tomorrow)
   */
  private getNextResetTime(): Date {
    return this.getTomorrowStart();
  }

  /**
   * Gets remaining quota for a user
   */
  async getRemainingQuota(userId: string): Promise<number> {
    const rateLimitInfo = await this.getRateLimitInfo(userId);
    return Math.max(0, rateLimitInfo.dailyLimit - rateLimitInfo.emailsSent);
  }

  /**
   * Gets the time remaining until quota resets
   */
  async getTimeUntilReset(userId: string): Promise<number> {
    const rateLimitInfo = await this.getRateLimitInfo(userId);
    const now = new Date();
    return Math.max(0, rateLimitInfo.resetTime.getTime() - now.getTime());
  }

  /**
   * Checks if rate limiting is enabled for a user
   */
  async isRateLimitingEnabled(userId: string): Promise<boolean> {
    // For now, return true to enable rate limiting for all users
    // In a real implementation, this could be configurable per user
    return true;
  }
}

export default EmailRateLimiter;