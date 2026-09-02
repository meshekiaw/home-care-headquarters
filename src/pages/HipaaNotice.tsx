import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

export default function HipaaNotice() {
  return (
    <LegalPageLayout
      title="Notice of Privacy Practices"
      subtitle="THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY."
      effectiveDate="September 1, 2026"
    >
      <LegalSection heading="Our Commitment">
        <p>
          Home Care Network is required by law to maintain the privacy of your Protected Health Information (PHI), to
          give you this notice of our legal duties and privacy practices, to notify you following a breach of unsecured
          PHI, and to follow the terms of the notice currently in effect.
        </p>
      </LegalSection>

      <LegalSection heading="How We May Use and Share Your Health Information">
        <p><strong>Treatment.</strong> We use and share your health information with caregivers, nurses, physicians, and other providers involved in your care so services can be coordinated and delivered safely.</p>
        <p><strong>Payment.</strong> We use and share your health information to bill and receive payment from Medicaid, the VA, waiver programs, private insurers, or you.</p>
        <p><strong>Health Care Operations.</strong> We use your health information for scheduling, quality review, staff training and supervision, credentialing, compliance auditing, and administrative operations.</p>
        <p><strong>Individuals Involved in Your Care.</strong> Unless you object, we may share relevant information with a family member, guardian, or other person you identify as involved in your care or payment for care.</p>
      </LegalSection>

      <LegalSection heading="Uses and Disclosures Permitted or Required by Law">
        <ul className="list-disc pl-5 space-y-1">
          <li>As required by federal, state, or local law.</li>
          <li>Public health activities, including reporting disease, injury, or vital events.</li>
          <li>Reporting suspected abuse, neglect, or domestic violence.</li>
          <li>Health oversight activities such as audits, licensure, and inspections.</li>
          <li>Judicial and administrative proceedings, subpoenas, and court orders.</li>
          <li>Law enforcement purposes as permitted by law.</li>
          <li>Coroners, medical examiners, funeral directors, and organ procurement organizations.</li>
          <li>Research approved by a privacy board or institutional review board.</li>
          <li>To avert a serious and imminent threat to health or safety.</li>
          <li>Specialized government functions, including military and national security activities.</li>
          <li>Workers' compensation programs as authorized by law.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Uses and Disclosures That Require Your Written Authorization">
        <p>
          Most uses and sharing of psychotherapy notes, any use of your information for marketing, and any sale of your
          information require your written authorization. Other uses and disclosures not described in this notice will be
          made only with your written authorization, and you may revoke that authorization in writing at any time except
          to the extent we have already acted in reliance on it.
        </p>
      </LegalSection>

      <LegalSection heading="Your Rights Regarding Your Health Information">
        <p><strong>Right to inspect and copy.</strong> You may request to see and receive a copy of your health information, including an electronic copy, generally within 30 days. A reasonable, cost-based fee may apply.</p>
        <p><strong>Right to amend.</strong> You may ask us to correct health information you believe is incorrect or incomplete. We may deny your request in certain cases and will explain why in writing.</p>
        <p><strong>Right to an accounting of disclosures.</strong> You may request a list of certain disclosures we made of your health information.</p>
        <p><strong>Right to request restrictions.</strong> You may ask us to limit the information we use or share. We are not required to agree, except that we must agree to withhold information from your health plan when you pay for a service in full out of pocket.</p>
        <p><strong>Right to confidential communications.</strong> You may ask us to contact you at an alternate address or phone number, and we will accommodate reasonable requests.</p>
        <p><strong>Right to a paper copy of this notice.</strong> You may request a paper copy at any time, even if you agreed to receive it electronically.</p>
        <p><strong>Right to breach notification.</strong> We will notify you if a breach occurs that may have compromised the privacy or security of your information.</p>
        <p><strong>Right to choose someone to act for you.</strong> A personal representative with legal authority may exercise these rights and make choices about your information.</p>
      </LegalSection>

      <LegalSection heading="Your Choices">
        <p>
          For certain information, you can tell us your choices about what we share — for example, sharing information
          with family or friends, or contacting you for fundraising. If you are unable to tell us your preference, we may
          share information when we believe it is in your best interest or necessary to lessen a serious threat to health
          or safety.
        </p>
      </LegalSection>

      <LegalSection heading="How We Protect Your Health Information">
        <p>
          We use administrative, physical, and technical safeguards, including encryption of data in transit and at rest,
          role-based and record-level access controls, automatic session timeout after inactivity, audit logging of
          access and changes, masking of sensitive identifiers, and workforce privacy and security training. Access to
          PHI is limited to the minimum necessary for each role.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to This Notice">
        <p>
          We may change this notice and make the new notice apply to health information we already have as well as any
          information we receive in the future. The current notice will always be posted on this page with its effective
          date, and copies are available on request.
        </p>
      </LegalSection>

      <LegalSection heading="Complaints">
        <p>
          If you believe your privacy rights have been violated, you may file a complaint with our Privacy Officer at{" "}
          <a className="text-primary underline" href="mailto:meshekiaw@gmail.com">meshekiaw@gmail.com</a>, or with the
          U.S. Department of Health and Human Services, Office for Civil Rights, 200 Independence Avenue SW, Washington,
          D.C. 20201, by calling 1-877-696-6775, or at{" "}
          <a className="text-primary underline" href="https://www.hhs.gov/ocr/privacy/hipaa/complaints/" target="_blank" rel="noopener noreferrer">
            hhs.gov/ocr/privacy/hipaa/complaints
          </a>
          . We will not retaliate against you for filing a complaint.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Home Care Network — Privacy Officer<br />
          Email: <a className="text-primary underline" href="mailto:meshekiaw@gmail.com">meshekiaw@gmail.com</a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
