/**
 * Global Application Feature Flags
 *
 * Control feature availability across Customer, Owner, Special User, and Admin views.
 */
export const FEATURES = {
  /**
   * Reviews & Ratings System
   * - Set to `false`: Reviews are completely hidden from all dashboards (Customer, Owner, Special, Admin).
   * - Set to `true`: Immediately activates customer reviews & ratings, owner responses, and admin/special moderation.
   */
  ENABLE_REVIEWS: false,

  /**
   * Customer Booking Emails
   * - Set to `false`: Disables booking confirmation emails to customers.
   * - Set to `true`: Re-enables automated booking receipt/confirmation emails to customers.
   */
  ENABLE_CUSTOMER_BOOKING_EMAILS: false,

  /**
   * Customer VIP Loyalty & Rewards Points
   * - Set to `false`: Loyalty and reward points are completely hidden from customer view.
   * - Set to `true`: Activates the customer VIP loyalty club, digital member passes, and points earning across authorized car washes.
   */
  ENABLE_LOYALTY_PROGRAM: true,
};
