import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Activates a campaign by changing its status from 'scheduled' to 'active'
 * and records the activation time
 */
export async function activateCampaign(campaignId: string): Promise<void> {
  const supabase = (global as any).supabase as SupabaseClient;
  
  try {
    // Check if the campaign exists and is in the correct state
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error(`Error fetching campaign ${campaignId}:`, fetchError);
      throw new Error(`Could not find campaign with ID ${campaignId}`);
    }

    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} does not exist`);
    }

    // Only allow activation if the campaign is currently 'scheduled'
    if (campaign.status !== 'scheduled') {
      throw new Error(`Campaign ${campaignId} is in status '${campaign.status}', cannot activate. Expected 'scheduled'.`);
    }

    // Update the campaign status to 'active' and set the started_at timestamp
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error(`Error activating campaign ${campaignId}:`, updateError);
      throw new Error(`Failed to activate campaign: ${updateError.message}`);
    }

    console.log(`Campaign ${campaignId} activated successfully`);
    
    // Optionally trigger any post-activation processes here
    // For example, starting the initial email sequence, etc.
  } catch (error) {
    console.error(`Error in activateCampaign for campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Pauses an active campaign
 */
export async function pauseCampaign(campaignId: string): Promise<void> {
  const supabase = (global as any).supabase as SupabaseClient;
  
  try {
    const { error } = await supabase
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
 * Resumes a paused campaign
 */
export async function resumeCampaign(campaignId: string): Promise<void> {
  const supabase = (global as any).supabase as SupabaseClient;
  
  try {
    const { error } = await supabase
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
 * Completes a campaign
 */
export async function completeCampaign(campaignId: string): Promise<void> {
  const supabase = (global as any).supabase as SupabaseClient;
  
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .in('status', ['active', 'paused']);

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
 * Updates campaign performance metrics
 */
export async function updateCampaignMetrics(
  campaignId: string,
  metrics: Record<string, any>
): Promise<void> {
  const supabase = (global as any).supabase as SupabaseClient;
  
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({
        performance_metrics: metrics
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
 * Gets campaign status
 */
export async function getCampaignStatus(campaignId: string): Promise<string> {
  const supabase = (global as any).supabase as SupabaseClient;
  
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error(`Error fetching status for campaign ${campaignId}:`, error);
      throw new Error(`Failed to get campaign status: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Campaign with ID ${campaignId} does not exist`);
    }

    return data.status;
  } catch (error) {
    console.error(`Error in getCampaignStatus for campaign ${campaignId}:`, error);
    throw error;
  }
}