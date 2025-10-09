import { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '../email/emailService';

interface Campaign {
  id: string;
  user_id: string;
  name: string;
  scheduled_start_time: string;
}

/**
 * Sends a notification to the user about an upcoming campaign start
 */
export async function sendCampaignStartNotification(campaign: Campaign): Promise<void> {
  try {
    // First get the user's email address
    const supabase = (global as any).supabase as SupabaseClient;
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', campaign.user_id)
      .single();

    if (userError) {
      console.error(`Error fetching user for campaign ${campaign.id}:`, userError);
      throw new Error(`Could not fetch user for campaign ${campaign.id}`);
    }

    // Format the scheduled time for the email
    const scheduledDate = new Date(campaign.scheduled_start_time);
    const formattedTime = scheduledDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Create the email content
    const subject = `Your AutoMeet Campaign "${campaign.name}" is Starting Soon!`;
    const htmlContent = `
      <html>
        <body>
          <h2>Your Campaign is Starting Soon!</h2>
          <p>Hello,</p>
          <p>Your AutoMeet campaign <strong>"${campaign.name}"</strong> is scheduled to start on <strong>${formattedTime}</strong>.</p>
          <p>The campaign will automatically begin reaching out to prospects according to your configured sequences.</p>
          <p>No further action is required from you - the system will handle everything automatically.</p>
          <p>Best regards,<br/>The AutoMeet Team</p>
        </body>
      </html>
    `;

    const textContent = `Your AutoMeet campaign "${campaign.name}" is scheduled to start on ${formattedTime}. The campaign will automatically begin reaching out to prospects according to your configured sequences.`;

    // Send the email
    await sendEmail(user.email, subject, htmlContent, textContent);

    console.log(`Campaign start notification sent to user ${campaign.user_id} for campaign ${campaign.id}`);
  } catch (error) {
    console.error('Error sending campaign start notification:', error);
    throw error;
  }
}

/**
 * Queues a notification to be sent at a specific time
 */
export async function queueNotification(
  supabase: SupabaseClient,
  userId: string,
  notificationType: string,
  message: string,
  scheduledFor: Date,
  priority: number = 3,
  metadata?: Record<string, any>
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: userId,
        notification_type: notificationType,
        message: message,
        scheduled_for: scheduledFor.toISOString(),
        priority: priority,
        metadata: metadata || {}
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error queuing notification:', error);
      throw new Error(`Failed to queue notification: ${error.message}`);
    }

    console.log(`Notification queued for user ${userId} with ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Error queuing notification:', error);
    throw error;
  }
}

/**
 * Processes pending notifications that are due to be sent
 */
export async function processPendingNotifications(supabase: SupabaseClient): Promise<void> {
  try {
    // Get current time
    const now = new Date().toISOString();
    
    // Get all pending notifications that are scheduled for now or earlier
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('delivery_status', 'pending')
      .lte('scheduled_for', now)
      .order('priority', { ascending: false }) // Higher priority first
      .order('scheduled_for', { ascending: true }); // Earlier scheduled first

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return;
    }

    if (!notifications || notifications.length === 0) {
      console.log('No pending notifications to process.');
      return;
    }

    console.log(`Processing ${notifications.length} pending notifications...`);

    // Process each notification
    for (const notification of notifications) {
      await processSingleNotification(supabase, notification);
    }
  } catch (error) {
    console.error('Error processing pending notifications:', error);
    throw error;
  }
}

/**
 * Processes a single notification
 */
async function processSingleNotification(
  supabase: SupabaseClient,
  notification: any
): Promise<void> {
  try {
    // Get the user's email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', notification.user_id)
      .single();

    if (userError) {
      console.error(`Error fetching user for notification ${notification.id}:`, userError);
      throw new Error(`Could not fetch user for notification ${notification.id}`);
    }

    // Send the notification email
    await sendEmail(user.email, `AutoMeet: ${notification.notification_type}`, notification.message, notification.message);

    // Update the notification status to 'sent'
    const { error: updateError } = await supabase
      .from('notification_queue')
      .update({
        delivery_status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    if (updateError) {
      console.error(`Error updating notification ${notification.id} status:`, updateError);
    } else {
      console.log(`Notification ${notification.id} sent successfully to user ${notification.user_id}`);
    }
  } catch (error) {
    console.error(`Error processing notification ${notification.id}:`, error);

    // Update the notification status to 'failed'
    try {
      const { error: updateError } = await supabase
        .from('notification_queue')
        .update({
          delivery_status: 'failed',
          error_message: error.message
        })
        .eq('id', notification.id);

      if (updateError) {
        console.error(`Error updating notification ${notification.id} to failed status:`, updateError);
      }
    } catch (updateError) {
      console.error(`Error updating notification ${notification.id} to failed status:`, updateError);
    }
  }
}

/**
 * Cancels a queued notification
 */
export async function cancelNotification(supabase: SupabaseClient, notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notification_queue')
      .update({ delivery_status: 'cancelled' })
      .eq('id', notificationId);

    if (error) {
      console.error(`Error cancelling notification ${notificationId}:`, error);
      throw new Error(`Failed to cancel notification: ${error.message}`);
    }

    console.log(`Notification ${notificationId} cancelled successfully`);
  } catch (error) {
    console.error('Error cancelling notification:', error);
    throw error;
  }
}