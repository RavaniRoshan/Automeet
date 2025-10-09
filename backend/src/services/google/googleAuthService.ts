import { google, Auth } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

class GoogleAuthService {
  private oauth2Client: Auth.OAuth2Client;
  private supabase: SupabaseClient;
  private config: GoogleAuthConfig;

  constructor(supabaseClient: SupabaseClient, config: GoogleAuthConfig) {
    this.supabase = supabaseClient;
    this.config = config;
    
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generates the Google OAuth consent URL for Gmail and Calendar access
   */
  generateAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',           // Send emails via Gmail
      'https://www.googleapis.com/auth/gmail.readonly',       // Read emails to track replies
      'https://www.googleapis.com/auth/calendar',             // Full calendar access
      'https://www.googleapis.com/auth/calendar.events',      // Access to calendar events
      'https://www.googleapis.com/auth/contacts.readonly',    // Read contacts for enrichment
      'https://www.googleapis.com/auth/userinfo.email',       // Access to user's email
      'https://www.googleapis.com/auth/userinfo.profile'      // Access to user's profile
    ];

    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Ensures we get a refresh token
      scope: scopes,
      prompt: 'consent', // Forces the consent screen to appear
      state: userId // Pass user ID to identify user after callback
    });

    return url;
  }

  /**
   * Handles the OAuth callback and stores tokens in the database
   */
  async handleAuthCallback(code: string, userId: string): Promise<void> {
    try {
      // Get tokens using the authorization code
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Encrypt tokens before storing (in production, use proper encryption)
      const encryptedAccessToken = this.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token 
        ? this.encryptToken(tokens.refresh_token) 
        : null;
      
      // Store tokens in the user_calendar_settings table
      const { error } = await this.supabase
        .from('user_calendar_settings')
        .upsert({
          user_id: userId,
          google_access_token: encryptedAccessToken,
          google_refresh_token: encryptedRefreshToken,
          sync_status: 'active'
        }, { onConflict: 'user_id' });

      if (error) {
        console.error(`Error storing Google tokens for user ${userId}:`, error);
        throw new Error(`Failed to store Google tokens: ${error.message}`);
      }

      console.log(`Google tokens stored successfully for user ${userId}`);
    } catch (error) {
      console.error('Error in handleAuthCallback:', error);
      throw error;
    }
  }

  /**
   * Sets the credentials for the OAuth2 client using stored tokens
   */
  async setCredentials(userId: string): Promise<void> {
    try {
      // Retrieve tokens from the database
      const { data: userSettings, error } = await this.supabase
        .from('user_calendar_settings')
        .select('google_access_token, google_refresh_token')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error(`Error retrieving Google tokens for user ${userId}:`, error);
        throw new Error(`Failed to retrieve Google tokens: ${error.message}`);
      }

      if (!userSettings || !userSettings.google_access_token) {
        throw new Error(`No Google tokens found for user ${userId}`);
      }

      // Decrypt tokens (in production, use proper decryption)
      const decryptedAccessToken = this.decryptToken(userSettings.google_access_token);
      const decryptedRefreshToken = userSettings.google_refresh_token
        ? this.decryptToken(userSettings.google_refresh_token)
        : undefined;

      // Set credentials on the OAuth2 client
      this.oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
        // The expiry date will be handled automatically by the Google API client
      });

      console.log(`Credentials set successfully for user ${userId}`);
    } catch (error) {
      console.error(`Error setting credentials for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Refreshes the Google access token using the refresh token
   */
  async refreshAccessToken(userId: string): Promise<string> {
    try {
      // Retrieve the refresh token from the database
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('google_refresh_token')
        .eq('user_id', userId)
        .single();

      if (settingsError) {
        console.error(`Error retrieving refresh token for user ${userId}:`, settingsError);
        throw new Error(`Failed to retrieve refresh token: ${settingsError.message}`);
      }

      if (!userSettings || !userSettings.google_refresh_token) {
        throw new Error(`No refresh token found for user ${userId}`);
      }

      // Decrypt the refresh token
      const decryptedRefreshToken = this.decryptToken(userSettings.google_refresh_token);
      
      // Set the refresh token on the OAuth2 client
      this.oauth2Client.setCredentials({
        refresh_token: decryptedRefreshToken
      });

      // Refresh the access token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const newAccessToken = credentials.access_token;

      if (!newAccessToken) {
        throw new Error('Failed to refresh access token');
      }

      // Encrypt and store the new access token
      const encryptedNewAccessToken = this.encryptToken(newAccessToken);
      
      const { error: updateError } = await this.supabase
        .from('user_calendar_settings')
        .update({
          google_access_token: encryptedNewAccessToken,
          last_sync_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error(`Error updating new access token for user ${userId}:`, updateError);
        throw new Error(`Failed to update new access token: ${updateError.message}`);
      }

      console.log(`Access token refreshed successfully for user ${userId}`);
      return newAccessToken;
    } catch (error) {
      console.error(`Error refreshing access token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Checks if the current access token is expired
   */
  async isTokenExpired(userId: string): Promise<boolean> {
    try {
      // In a real implementation, you would check the token's expiry date
      // For now, we'll just return true to always check validity
      // The Google API client actually handles token refresh automatically
      await this.setCredentials(userId);
      
      // The Google API client will automatically refresh the token if needed
      // when we try to make an API call. To check if the token is expired
      // without making an API call, we would need to parse the JWT and check
      // the expiry date.
      
      // As a simple check, we'll try to make a simple API call to see if it works
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2'
      });
      
      try {
        await oauth2.userinfo.get();
        return false; // Token is still valid
      } catch (apiError: any) {
        // If the API call fails with an authentication error, the token may be expired
        if (apiError.code === 401 || apiError.status === 401) {
          return true;
        }
        throw apiError;
      }
    } catch (error) {
      console.error(`Error checking token expiration for user ${userId}:`, error);
      // If we can't check the token status, assume it's expired
      return true;
    }
  }

  /**
   * Encrypts a token (placeholder - in production, use proper encryption)
   */
  private encryptToken(token: string): string {
    // In a real application, you would use proper encryption like:
    // - AES-256-GCM encryption
    // - or a service like AWS KMS, Google Cloud KMS, etc.
    // For this example, we'll just return the token as-is
    // This is insecure and should be replaced in production
    return token;
  }

  /**
   * Decrypts a token (placeholder - in production, use proper decryption)
   */
  private decryptToken(encryptedToken: string): string {
    // In a real application, you would use proper decryption
    // This is insecure and should be replaced in production
    return encryptedToken;
  }

  /**
   * Revokes the user's Google tokens and clears them from the database
   */
  async revokeTokens(userId: string): Promise<void> {
    try {
      // First try to revoke the token via Google API
      await this.oauth2Client.revokeCredentials();

      // Then remove tokens from the database
      const { error } = await this.supabase
        .from('user_calendar_settings')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          sync_status: 'inactive'
        })
        .eq('user_id', userId);

      if (error) {
        console.error(`Error clearing Google tokens for user ${userId}:`, error);
        throw new Error(`Failed to clear Google tokens: ${error.message}`);
      }

      console.log(`Google tokens revoked and cleared for user ${userId}`);
    } catch (error) {
      console.error(`Error revoking tokens for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the OAuth2 client instance (for other services to use)
   */
  getOAuth2Client(): Auth.OAuth2Client {
    return this.oauth2Client;
  }
}

export default GoogleAuthService;