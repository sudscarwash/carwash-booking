import React from 'react';
import { Mail, MessageCircle, MapPin, Building, ShieldCheck, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

export const TermsAndConditionsContent: React.FC = () => {
  const { platformInfo } = useApp();

  // Dynamic values stored in database (configured by Admin in Admin Dashboard)
  const companyName = platformInfo?.companyName || 'AUTOSHINE BN';
  const email = platformInfo?.email || 'info@autoshinebn.com';
  const whatsapp = platformInfo?.whatsapp || platformInfo?.contact || '+673 8974459';
  const address = platformInfo?.address || 'Unit 1, 1st Floor Block C, Kiarong Complex BSB BE1318';
  const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');

  return (
    <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-6" id="autoshine-terms-content">
      {/* Title & Effective Date Header */}
      <div className="border-b border-slate-200 pb-4 text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-bold uppercase tracking-wider mb-2">
          <FileText className="w-3.5 h-3.5" />
          Official Policy
        </div>
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
          {companyName.toUpperCase()} TERMS AND CONDITIONS OF USE
        </h2>
        <p className="text-xs font-semibold text-sky-600 mt-1">
          Effective Date: 1st September 2026
        </p>
      </div>

      {/* Preamble */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-slate-700 font-medium leading-relaxed">
        These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the {companyName} mobile
        application and website (&quot;Platform&quot;). By registering for an account or using the Platform, you agree to be bound
        by these Terms.
      </div>

      {/* 20 Numbered Sections */}
      <div className="space-y-6 text-left divide-y divide-slate-100">
        {/* 1. Definitions */}
        <div className="pt-4 first:pt-0">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">1</span>
            Definitions
          </h3>
          <ul className="pl-7 space-y-1.5 list-disc text-slate-600">
            <li><strong className="text-slate-800">{companyName}</strong> means the owner and operator of the booking platform.</li>
            <li><strong className="text-slate-800">User</strong> means any person who registers or uses the Platform.</li>
            <li><strong className="text-slate-800">Service Operator</strong> means an independent car wash company offering services through the Platform.</li>
            <li><strong className="text-slate-800">Booking</strong> means a reservation made by a User for car wash services.</li>
          </ul>
        </div>

        {/* 2. Acceptance of Terms */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">2</span>
            Acceptance of Terms
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>By using AUTOSHINE BN, you confirm that you:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Are at least 18 years old or have permission from a parent or legal guardian.</li>
              <li>Agree to comply with these Terms and all applicable laws of Brunei Darussalam.</li>
            </ul>
          </div>
        </div>

        {/* 3. Platform Services */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">3</span>
            Platform Services
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>AUTOSHINE BN provides an online platform that enables Users to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Browse participating car wash operators.</li>
              <li>View available services and pricing.</li>
              <li>Schedule appointments.</li>
              <li>Receive booking confirmations and notifications.</li>
            </ul>
            <p className="text-slate-700 font-semibold bg-sky-50/70 p-2.5 rounded-xl border border-sky-100 mt-2">
              AUTOSHINE BN acts solely as a booking platform and is not the provider of the car wash services.
            </p>
          </div>
        </div>

        {/* 4. User Account */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">4</span>
            User Account
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>Users are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Providing accurate and current information.</li>
              <li>Keeping login credentials confidential.</li>
              <li>Maintaining the security of their account.</li>
              <li>Promptly updating any changes to their contact details.</li>
            </ul>
            <p className="font-medium text-slate-700 mt-2">
              Users are responsible for all activities conducted through their account.
            </p>
          </div>
        </div>

        {/* 5. Booking Policy */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">5</span>
            Booking Policy
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>Users agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate vehicle information.</li>
              <li>Arrive at the scheduled appointment on time.</li>
              <li>Inform the Service Operator if they are unable to attend.</li>
            </ul>
            <p className="font-medium text-slate-700 mt-2">
              Bookings are subject to acceptance by the selected Service Operator.
            </p>
          </div>
        </div>

        {/* 6. Pricing */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">6</span>
            Pricing
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>Prices displayed on the Platform are determined by the respective Service Operators.</p>
            <p>
              AUTOSHINE BN does not guarantee that prices will remain unchanged and reserves the right to update pricing
              information provided by Service Operators.
            </p>
            <p>
              Additional charges may apply if the actual condition or size of the vehicle differs from the information provided
              during booking.
            </p>
          </div>
        </div>

        {/* 7. Payments */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">7</span>
            Payments
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>Payments for the carwash service shall be paid directly to the operator.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Payment shall be made using approved payment methods.</li>
            </ul>
          </div>
        </div>

        {/* 8. Cancellation and Refunds */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">8</span>
            Cancellation and Refunds
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>Users may cancel bookings in accordance with the cancellation policy displayed on the Platform.</p>
            <p>Refund eligibility depends on:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Service Operator&apos;s cancellation policy.</li>
              <li>Any applicable processing fees.</li>
            </ul>
            <p className="text-slate-700 font-medium mt-2">
              Failure to attend a confirmed appointment without notice may result in cancellation charges or restrictions on
              future bookings.
            </p>
          </div>
        </div>

        {/* 9. User Responsibilities */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">9</span>
            User Responsibilities
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>Users shall:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Treat Service Operators and their employees respectfully.</li>
              <li>Ensure that vehicles are legally owned or used with the owner&apos;s permission.</li>
              <li>Remove valuables from the vehicle before the service.</li>
              <li>Disclose any special instructions relating to the vehicle.</li>
            </ul>
            <p className="text-amber-800 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2">
              AUTOSHINE BN shall not be responsible for valuables left inside vehicles.
            </p>
          </div>
        </div>

        {/* 10. Service Quality */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">10</span>
            Service Quality
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>The quality of car wash services is the responsibility of the selected Service Operator.</p>
            <p>Any complaints regarding service quality should first be directed to the Service Operator.</p>
            <p>AUTOSHINE BN may assist in facilitating communication but does not guarantee any specific outcome.</p>
          </div>
        </div>

        {/* 11. Limitation of Liability */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">11</span>
            Limitation of Liability
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>AUTOSHINE BN:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Does not perform the car wash services.</li>
              <li>Is not responsible for damage caused during the provision of services by Service Operators.</li>
              <li>Is not liable for delays, cancellations, or service interruptions caused by Service Operators.</li>
              <li>Is not responsible for disputes between Users and Service Operators.</li>
            </ul>
            <p className="font-semibold text-slate-800 mt-2">
              To the fullest extent permitted by law, AUTOSHINE BN&apos;s liability is limited to the amount paid through the
              Platform for the affected booking.
            </p>
          </div>
        </div>

        {/* 12. Vehicle Damage */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">12</span>
            Vehicle Damage
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>
              Any claims relating to vehicle damage shall be made directly to the Service Operator responsible for providing
              the service.
            </p>
            <p>
              AUTOSHINE BN may assist in facilitating communication but accepts no liability for the acts or omissions of
              Service Operators.
            </p>
          </div>
        </div>

        {/* 13. Intellectual Property */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">13</span>
            Intellectual Property
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>
              All content on the Platform, including trademarks, logos, graphics, software, and text, remains the property of
              AUTOSHINE BN or its licensors.
            </p>
            <p>Users shall not copy, reproduce, distribute, or modify any content without prior written permission.</p>
          </div>
        </div>

        {/* 14. Privacy */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">14</span>
            Privacy
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>
              AUTOSHINE BN collects and processes personal information solely for the purpose of providing booking
              services and improving the Platform.
            </p>
            <p>Personal information will be handled in accordance with AUTOSHINE BN&apos;s Privacy Policy and applicable laws.</p>
          </div>
        </div>

        {/* 15. Prohibited Conduct */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">15</span>
            Prohibited Conduct
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>Users shall not:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use false identities.</li>
              <li>Make fraudulent bookings.</li>
              <li>Interfere with the operation of the Platform.</li>
              <li>Upload malicious software or harmful content.</li>
              <li>Misuse payment systems.</li>
              <li>Engage in unlawful activities through the Platform.</li>
            </ul>
          </div>
        </div>

        {/* 16. Suspension or Termination */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">16</span>
            Suspension or Termination
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>AUTOSHINE BN may suspend or terminate a User account without prior notice if the User:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Breaches these Terms.</li>
              <li>Engages in fraudulent or illegal conduct.</li>
              <li>Misuses the Platform.</li>
              <li>Repeatedly fails to honour confirmed bookings.</li>
            </ul>
          </div>
        </div>

        {/* 17. Platform Availability */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">17</span>
            Platform Availability
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>AUTOSHINE BN aims to provide continuous service but does not guarantee uninterrupted access.</p>
            <p>
              Temporary interruptions may occur due to maintenance, upgrades, technical failures, or events beyond
              reasonable control.
            </p>
          </div>
        </div>

        {/* 18. Changes to These Terms */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">18</span>
            Changes to These Terms
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>AUTOSHINE BN reserves the right to amend these Terms at any time.</p>
            <p>
              Updated Terms shall become effective upon publication on the Platform. Continued use of the Platform
              constitutes acceptance of the revised Terms.
            </p>
          </div>
        </div>

        {/* 19. Governing Law */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">19</span>
            Governing Law
          </h3>
          <div className="pl-7 space-y-2 text-slate-600">
            <p>These Terms shall be governed by and interpreted in accordance with the laws of Brunei Darussalam.</p>
            <p>
              Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Brunei
              Darussalam.
            </p>
          </div>
        </div>

        {/* 20. Contact Information */}
        <div className="pt-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black">20</span>
            Contact Information
          </h3>
          <div className="pl-7 space-y-3 text-slate-600">
            <p>For enquiries, support, or complaints, please contact:</p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 text-slate-800 font-black">
                <Building className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{companyName}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  Email:{' '}
                  <a href={`mailto:${email}`} className="text-sky-600 font-bold hover:underline">
                    {email}
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  WhatsApp:{' '}
                  <a 
                    href={cleanWhatsapp ? `https://wa.me/${cleanWhatsapp}` : '#'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    {whatsapp}
                  </a>
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-700">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  Business Address:{' '}
                  <span className="font-medium text-slate-800">{address}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acknowledgment Footer Note */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <p className="text-slate-700 text-xs sm:text-sm font-semibold leading-relaxed bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200">
          By creating an account or using the AUTOSHINE BN Platform, you acknowledge that you have read,
          understood, and agreed to these Terms and Conditions.
        </p>
      </div>
    </div>
  );
};
