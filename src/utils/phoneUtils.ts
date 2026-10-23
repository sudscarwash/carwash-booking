/**
 * Brunei Phone & WhatsApp Connectivity Utilities
 * Formats Brunei landlines, mobiles, and WhatsApp wa.me deep links.
 */

export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.trim();
}

/**
 * Normalizes a Brunei phone number for WhatsApp deep-linking.
 * Handles +673, 673, local 7-digit numbers (8XXXXXX, 7XXXXXX, 2XXXXXX), and dashes/spaces.
 */
export function formatBruneiPhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  
  // If user included leading trunk zero (e.g. 08881234), strip it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If local 7-digit Brunei number without 673 prefix, prepend Brunei country code 673
  if (!cleaned.startsWith('673') && cleaned.length === 7) {
    cleaned = `673${cleaned}`;
  }

  return cleaned;
}

/**
 * Generates an active, direct WhatsApp Web / App link (https://wa.me/...)
 * with optional URL-encoded greeting text.
 */
export function getWhatsAppUrl(phone?: string, text?: string): string {
  const formattedNumber = formatBruneiPhoneForWhatsApp(phone);
  if (!formattedNumber) return '#';
  const queryParam = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${formattedNumber}${queryParam}`;
}

/**
 * Generates an active tel: link for instant calling on smartphones.
 */
export function getPhoneCallUrl(phone?: string): string {
  if (!phone) return '#';
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return `tel:${cleaned}`;
}
