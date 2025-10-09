import { google } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';
import GoogleAuthService from './googleAuthService';

interface PersonData {
  resourceName: string;
  emailAddresses?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  names?: Array<{
    displayName: string;
    familyName: string;
    givenName: string;
    displayNameLastFirst: string;
  }>;
  organizations?: Array<{
    name: string;
    title: string;
    department: string;
    domain: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
}

interface EnrichedProspectData {
  contactName?: string;
  jobTitle?: string;
  companyName?: string;
  industry?: string;
  phone?: string;
}

class PeopleService {
  private supabase: SupabaseClient;
  private googleAuth: GoogleAuthService;

  constructor(supabaseClient: SupabaseClient, googleAuthService: GoogleAuthService) {
    this.supabase = supabaseClient;
    this.googleAuth = googleAuthService;
  }

  /**
   * Gets contact information using Google People API
   */
  async getContactByEmailAddress(email: string, userId: string): Promise<PersonData | null> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the People API instance
      const people = google.people({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Search for people by email address
      const response = await people.people.searchContacts({
        query: email,
        readMask: 'names,emailAddresses,organizations,phoneNumbers'
      });

      if (!response.data.results || response.data.results.length === 0) {
        console.log(`No contact found for email: ${email}`);
        return null;
      }

      // Return the first matching contact
      return response.data.results[0].person;
    } catch (error) {
      console.error(`Error getting contact for email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Gets contact information by name
   */
  async getContactByName(name: string, userId: string): Promise<PersonData[]> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the People API instance
      const people = google.people({ version: 'v1', auth: this.googleAuth.getOAuth2Client() });

      // Search for people by name
      const response = await people.people.searchContacts({
        query: name,
        readMask: 'names,emailAddresses,organizations,phoneNumbers'
      });

      if (!response.data.results) {
        console.log(`No contacts found for name: ${name}`);
        return [];
      }

      // Return all matching contacts
      return response.data.results.map(result => result.person);
    } catch (error) {
      console.error(`Error getting contacts for name ${name}:`, error);
      throw error;
    }
  }

  /**
   * Enriches prospect data using Google People API
   */
  async enrichProspectData(prospectId: string, userId: string): Promise<EnrichedProspectData> {
    try {
      // Get the prospect from the database
      const { data: prospect, error: prospectError } = await this.supabase
        .from('prospects')
        .select('*')
        .eq('id', prospectId)
        .single();

      if (prospectError) {
        console.error(`Error fetching prospect ${prospectId}:`, prospectError);
        throw new Error(`Failed to fetch prospect: ${prospectError.message}`);
      }

      if (!prospect) {
        throw new Error(`Prospect with ID ${prospectId} not found`);
      }

      let enrichedData: EnrichedProspectData = {};

      // If we have an email, try to find contact details
      if (prospect.email) {
        const contactData = await this.getContactByEmailAddress(prospect.email, userId);
        
        if (contactData) {
          // Extract name information
          if (contactData.names && contactData.names.length > 0) {
            const name = contactData.names[0];
            enrichedData.contactName = name.displayName || `${name.givenName} ${name.familyName}`;
          }
          
          // Extract organization information
          if (contactData.organizations && contactData.organizations.length > 0) {
            const org = contactData.organizations[0];
            enrichedData.companyName = org.name;
            enrichedData.jobTitle = org.title;
          }
          
          // Extract phone information
          if (contactData.phoneNumbers && contactData.phoneNumbers.length > 0) {
            // Get the primary or first phone number
            const primaryPhone = contactData.phoneNumbers.find(phone => phone.primary) || contactData.phoneNumbers[0];
            if (primaryPhone) {
              enrichedData.phone = primaryPhone.value;
            }
          }
        }
      } 
      // If we don't have email but have a name, try searching by name
      else if (prospect.contact_name) {
        const contacts = await this.getContactByName(prospect.contact_name, userId);
        
        if (contacts && contacts.length > 0) {
          const contactData = contacts[0]; // Use the first match
          
          // Extract organization information
          if (contactData.organizations && contactData.organizations.length > 0) {
            const org = contactData.organizations[0];
            enrichedData.companyName = org.name;
            enrichedData.jobTitle = org.title;
          }
          
          // Extract phone information
          if (contactData.phoneNumbers && contactData.phoneNumbers.length > 0) {
            const primaryPhone = contactData.phoneNumbers.find(phone => phone.primary) || contactData.phoneNumbers[0];
            if (primaryPhone) {
              enrichedData.phone = primaryPhone.value;
            }
          }
        }
      }

      // Update the prospect record with enriched data
      const updateData: any = { enrichment_data: { ...prospect.enrichment_data, ...enrichedData } };
      
      // Update name, job title, and company only if they're not already set or if we got new values
      if (enrichedData.contactName && !prospect.contact_name) {
        updateData.contact_name = enrichedData.contactName;
      }
      if (enrichedData.jobTitle && !prospect.job_title) {
        updateData.job_title = enrichedData.jobTitle;
      }
      if (enrichedData.companyName && !prospect.company_name) {
        updateData.company_name = enrichedData.companyName;
      }
      if (enrichedData.phone && !prospect.phone) {
        updateData.phone = enrichedData.phone;
      }

      await this.supabase
        .from('prospects')
        .update(updateData)
        .eq('id', prospectId);

      console.log(`Prospect ${prospectId} enriched successfully`);
      return enrichedData;
    } catch (error) {
      console.error(`Error enriching prospect ${prospectId}:`, error);
      throw error;
    }
  }

  /**
   * Enriches multiple prospects in a batch
   */
  async enrichProspectsBatch(prospectIds: string[], userId: string): Promise<Record<string, EnrichedProspectData>> {
    try {
      const results: Record<string, EnrichedProspectData> = {};

      // Process each prospect with a delay to avoid rate limiting
      for (let i = 0; i < prospectIds.length; i++) {
        const prospectId = prospectIds[i];
        
        try {
          const enrichedData = await this.enrichProspectData(prospectId, userId);
          results[prospectId] = enrichedData;
          
          // Add a small delay between requests to avoid rate limiting
          if (i < prospectIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
          }
        } catch (error) {
          console.error(`Failed to enrich prospect ${prospectId}:`, error);
          // Continue with other prospects even if one fails
          results[prospectId] = {};
        }
      }

      return results;
    } catch (error) {
      console.error('Error in batch enrichment:', error);
      throw error;
    }
  }

  /**
   * Validates contact information using Google People API
   */
  async validateContact(email: string, name?: string, userId: string = ''): Promise<boolean> {
    try {
      let contactFound = false;
      
      // If we have an email, try to find it directly
      if (email) {
        try {
          const contactData = await this.getContactByEmailAddress(email, userId);
          contactFound = !!contactData;
        } catch (error) {
          console.log(`Contact not found for email ${email}:`, error.message);
        }
      }
      
      // If not found by email and name is provided, try searching by name
      if (!contactFound && name) {
        try {
          const contacts = await this.getContactByName(name, userId);
          contactFound = contacts.length > 0;
        } catch (error) {
          console.log(`No contacts found for name ${name}:`, error.message);
        }
      }

      return contactFound;
    } catch (error) {
      console.error(`Error validating contact ${email || name}:`, error);
      // If there's an error, we can't validate, so return false
      return false;
    }
  }
}

export default PeopleService;