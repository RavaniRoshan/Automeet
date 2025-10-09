import { SupabaseClient } from '@supabase/supabase-js';
import GoogleAuthService from './google/googleAuthService';

class TokenRefreshHandler {
  private supabase: SupabaseClient;
  private googleAuth: GoogleAuthService;

  constructor(supabaseClient: SupabaseClient, googleAuthService: GoogleAuthService) {
    this.supabase = supabaseClient;
    this.googleAuth = googleAuthService;
  }

  /**
   * Refreshes all expired Google access tokens in the system
   */
  async refreshAllExpiredTokens(): Promise<void> {
    try {
      console.log('Starting refresh of all expired Google tokens...');

      // Find all users with Google calendar settings and refresh tokens
      const { data: userSettings, error } = await this.supabase
        .from('user_calendar_settings')
        .select('user_id, google_refresh_token, sync_status')
        .not('google_refresh_token', 'is', null)
        .in('sync_status', ['active', 'error']); // Only process active accounts or accounts with errors

      if (error) {
        console.error('Error fetching user calendar settings:', error);
        throw new Error(`Failed to fetch user calendar settings: ${error.message}`);
      }

      if (!userSettings || userSettings.length === 0) {
        console.log('No user calendar settings with refresh tokens found.');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Process each user
      for (const setting of userSettings) {
        try {
          await this.refreshUserToken(setting.user_id);
          successCount++;
          console.log(`Successfully refreshed token for user ${setting.user_id}`);
        } catch (refreshError) {
          errorCount++;
          console.error(`Failed to refresh token for user ${setting.user_id}:`, refreshError);

          // Update sync status to error for this user
          try {
            await this.supabase
              .from('user_calendar_settings')
              .update({ sync_status: 'error' })
              .eq('user_id', setting.user_id);
          } catch (updateError) {
            console.error(`Failed to update sync status for user ${setting.user_id}:`, updateError);
          }
        }

        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Token refresh completed. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      console.error('Error in refreshAllExpiredTokens:', error);
      throw error;
    }
  }

  /**
   * Refreshes a specific user's Google access token
   */
  async refreshUserToken(userId: string): Promise<void> {
    try {
      console.log(`Refreshing Google token for user ${userId}`);

      // Use the GoogleAuthService to refresh the token
      const newAccessToken = await this.googleAuth.refreshAccessToken(userId);

      // Update the sync status to active after successful refresh
      const { error } = await this.supabase
        .from('user_calendar_settings')
        .update({ 
          sync_status: 'active',
          last_sync_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error(`Error updating sync status for user ${userId}:`, error);
        // Don't throw error here as the token refresh was successful
      }

      console.log(`Token refreshed successfully for user ${userId}`);
    } catch (error) {
      console.error(`Error refreshing token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Checks and refreshes tokens for a specific user if needed
   */
  async checkAndRefreshUserToken(userId: string): Promise<boolean> {
    try {
      // Check if the token is expired
      const isExpired = await this.googleAuth.isTokenExpired(userId);

      if (isExpired) {
        console.log(`Token for user ${userId} is expired, refreshing...`);
        await this.refreshUserToken(userId);
        return true; // Token was refreshed
      }

      return false; // Token was not expired
    } catch (error) {
      console.error(`Error checking and refreshing token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Schedules automatic token refresh checking
   * This would typically be called once at application startup
   */
  scheduleTokenRefresh(intervalMinutes: number = 60): NodeJS.Timeout {
    console.log(`Scheduling automatic token refresh every ${intervalMinutes} minutes`);
    
    // Run immediately when scheduled
    this.refreshAllExpiredTokens().catch(error => {
      console.error('Error during initial token refresh:', error);
    });

    // Then run on the specified interval
    return setInterval(() => {
      this.refreshAllExpiredTokens().catch(error => {
        console.error('Error during scheduled token refresh:', error);
      });
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
  }

  /**
   * Manually rotates a user's refresh token
   * Note: Google automatically rotates refresh tokens, so this is just for special cases
   */
  async rotateRefreshToken(userId: string): Promise<void> {
    try {
      console.log(`Initiating refresh token rotation for user ${userId}`);

      // This would involve going through the OAuth flow again
      // For now, we'll just refresh the existing token, which updates the access token
      // Google automatically rotates refresh tokens when they are used
      await this.refreshUserToken(userId);
      
      console.log(`Refresh token rotation initiated for user ${userId}`);
    } catch (error) {
      console.error(`Error rotating refresh token for user ${userId}:`, error);
      throw error;
    }
  }
}

export default TokenRefreshHandler;