import { Event, Filter, SimplePool, getEventHash } from "nostr-tools";
import { getDefaultRelays } from "../formstr";

// Helper function to validate relay URLs
const validateRelayUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    // Add protocol if missing
    let sanitized = url.trim();
    if (!sanitized.startsWith('wss://') && !sanitized.startsWith('ws://')) {
      sanitized = 'wss://' + sanitized;
    }
    
    // Test if valid URL with appropriate protocol
    const testUrl = new URL(sanitized);
    return testUrl.protocol === 'ws:' || testUrl.protocol === 'wss:';
  } catch (e) {
    console.warn('Invalid relay URL:', url);
    return false;
  }
};

// Helper to sanitize relay URLs
export const sanitizeRelayUrls = (relays: string[] = []): string[] => {
  return relays
    .filter(url => url && typeof url === 'string')
    .map(url => {
      let sanitized = url.trim();
      if (!sanitized.startsWith('wss://') && !sanitized.startsWith('ws://')) {
        return 'wss://' + sanitized;
      }
      return sanitized;
    })
    .filter(url => {
      try {
        const testUrl = new URL(url);
        return testUrl.protocol === 'ws:' || testUrl.protocol === 'wss:';
      } catch (e) {
        console.warn('Filtered invalid relay URL:', url);
        return false;
      }
    });
};

export const fetchFormResponses = async (
  pubKey: string,
  formId: string,
  allowedPubkeys?: string[],
  relays?: string[]
): Promise<Event[]> => {
  console.log("Starting to fetch!!!!");
  const pool = new SimplePool();
  
  // Sanitize and validate relay URLs
  const providedRelays = sanitizeRelayUrls(relays);
  const defaultRelays = sanitizeRelayUrls(getDefaultRelays());
  
  // Make sure we have at least one valid relay
  let relayList = [...providedRelays, ...defaultRelays];
  if (relayList.length === 0) {
    console.warn('No valid relays available, using fallback relay');
    relayList = ['wss://relay.damus.io']; // Fallback to a reliable relay
  }
  
  console.log('Using validated relays:', relayList);
  
  const filter: Filter = {
    kinds: [1069],
    "#a": [`30168:${pubKey}:${formId}`],
  };
  
  if (allowedPubkeys) filter.authors = allowedPubkeys;
  
  try {
    const nostrEvents = await pool.querySync(relayList, filter);
    pool.close(relayList);
    return nostrEvents;
  } catch (error) {
    console.error('Error fetching form responses:', error);
    pool.close(relayList);
    return [];
  }
};
