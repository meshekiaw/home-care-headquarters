import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How Home Care Network collects, uses, stores, and protects information in this platform."
      effectiveDate="September 1, 2026"
    >
      <LegalSection heading="1. Who We Are">
        <p>
          Home Care Network ("we", "us", "our") operates this home care management platform for our clients,
          caregivers, nurses, and administrative staff. Questions about this policy may be sent to{" "}
          <a className="text-primary underline" href="mailto:privacy@homecareheadquarters.org">privacy@homecareheadquarters.org</a>.
        </p>
      </LegalSection>

      <LegalSection heading="2. Information We Collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account information:</strong> name, email address, phone number, role, and login credentials.</li>
          <li><strong>Client information:</strong> demographics, addresses, payer or program (Medicaid, VA, ARChoices, private pay), authorizations, service hours, care plans, and assessment records.</li>
          <li><strong>Health information:</strong> diagnoses, medications, medical history, nursing documentation, and other Protected Health Information (PHI) needed to coordinate care.</li>
          <li><strong>Workforce information:</strong> caregiver and nurse credentials, licenses, background clearances, training and orientation records, availability, and schedules.</li>
          <li><strong>Communications:</strong> messages, email and SMS notifications, and signature or acknowledgment records.</li>
          <li><strong>Technical information:</strong> log data, timestamps, IP address, browser type, and audit trail entries generated when users view or change records.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. How We Use Information">
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide, schedule, and document home care services.</li>
          <li>Match caregivers to clients based on skills, availability, and proximity.</li>
          <li>Track training, orientation, credentials, and compliance deadlines.</li>
          <li>Send appointment, shift, training, and compliance notifications by email or SMS.</li>
          <li>Bill and report to payers and regulators as permitted by law.</li>
          <li>Secure the platform, investigate misuse, and maintain audit logs.</li>
        </ul>
        <p>We do not sell personal information, and we do not use PHI for marketing without written authorization.</p>
      </LegalSection>

      <LegalSection heading="4. How Information Is Stored">
        <p>
          Records are stored in a managed cloud database and file storage with access rules that limit each account to
          only the records it is authorized to see. Uploaded documents (assessments, forms, credentials, signed PDFs)
          are held in restricted storage buckets. Backups are maintained for continuity and disaster recovery.
        </p>
      </LegalSection>

      <LegalSection heading="5. Security Measures">
        <ul className="list-disc pl-5 space-y-1">
          <li>Encryption in transit (TLS) and encryption of stored data at rest.</li>
          <li>Row-level access controls so users reach only their own records unless they hold an administrator role.</li>
          <li>Role-based permissions for administrators, nurses, and caregivers.</li>
          <li>Automatic sign-out after 15 minutes of inactivity.</li>
          <li>Audit logging of record access and changes.</li>
          <li>Restricted, credentialed access to sensitive identifiers such as Social Security numbers, which are masked in the interface.</li>
        </ul>
        <p>No system can guarantee absolute security, but we work to maintain safeguards appropriate to the sensitivity of the data we hold.</p>
      </LegalSection>

      <LegalSection heading="6. Sharing and Disclosure">
        <p>
          We share information only with the people and organizations involved in your care or required by law: assigned
          caregivers and nurses, agency administrators, payers and program administrators, and service providers who
          host our platform or deliver our email and SMS messages under written agreements. We may also disclose
          information when required by law, subpoena, or public health and safety authorities.
        </p>
      </LegalSection>

      <LegalSection heading="7. Retention">
        <p>
          We retain client, clinical, and employment records for as long as needed to deliver services and to satisfy
          state and federal recordkeeping, licensing, and payer requirements, and then dispose of them securely.
        </p>
      </LegalSection>

      <LegalSection heading="8. Your Rights">
        <ul className="list-disc pl-5 space-y-1">
          <li>Request access to, or a copy of, the information we hold about you.</li>
          <li>Request correction of inaccurate or incomplete information.</li>
          <li>Request restrictions on certain uses or disclosures.</li>
          <li>Request confidential communications at an alternate address or phone number.</li>
          <li>Opt out of non-essential email or SMS notifications using the unsubscribe link or by contacting us.</li>
          <li>File a complaint without fear of retaliation.</li>
        </ul>
        <p>
          Health information rights are described in more detail in our HIPAA Notice of Privacy Practices.
        </p>
      </LegalSection>

      <LegalSection heading="9. Children's Privacy">
        <p>
          This platform is used by staff and authorized representatives. When we hold information about a minor
          receiving services, it is provided and managed by a parent or legal guardian.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to This Policy">
        <p>
          We may update this policy. Material changes will be posted on this page with a new effective date, and
          continued use of the platform after posting means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact Us">
        <p>
          Home Care Network — Privacy Officer<br />
          Email: <a className="text-primary underline" href="mailto:privacy@homecareheadquarters.org">privacy@homecareheadquarters.org</a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
