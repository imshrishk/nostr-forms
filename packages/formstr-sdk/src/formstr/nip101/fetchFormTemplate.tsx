import { Event, SimplePool, nip19 } from "nostr-tools";
import { getDefaultRelays, getUserPublicKey } from "../formstr";
import { Field, Tag } from "./interfaces";

// Import the sanitization function from fetchFormResponses
import { sanitizeRelayUrls } from './fetchFormResponses';

export const fetchFormTemplate = async (
  pubKey: string,
  formIdentifier: string,
  relays?: string[]
): Promise<Event | null> => {
  const pool = new SimplePool();
  let formIdPubkey = pubKey;
  
  // Sanitize and validate relay URLs
  const providedRelays = sanitizeRelayUrls(relays);
  const defaultRelays = sanitizeRelayUrls(getDefaultRelays());
  
  // Make sure we have at least one valid relay
  let relayList = providedRelays.length ? providedRelays : defaultRelays;
  if (relayList.length === 0) {
    console.warn('No valid relays available, using fallback relay');
    relayList = ['wss://relay.damus.io']; // Fallback to a reliable relay
  }
  
  console.log('Using validated relays for template fetch:', relayList);
  
  const filter = {
    kinds: [30168],
    authors: [formIdPubkey],
    "#d": [formIdentifier],
  };
  
  try {
    const nostrEvent = await pool.get(relayList, filter);
    console.log("nostr event fetched is", nostrEvent);
    pool.close(relayList);
    return nostrEvent;
  } catch (error) {
    console.error('Error fetching form template:', error);
    pool.close(relayList);
    return null;
  }
};
