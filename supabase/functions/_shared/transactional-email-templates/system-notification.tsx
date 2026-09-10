import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  subject?: string
  heading?: string
  bodyHtml?: string
  supportEmail?: string
}

const Email = ({
  subject = 'Notification',
  heading = 'Notification',
  bodyHtml = '',
  supportEmail = 'support@homecareheadquarters.org',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{heading}</Heading>
        </Section>
        <Section style={card}>
          <div style={content} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          <Hr style={hr} />
          <Text style={fine}>
            Home Care Headquarters &middot;{' '}
            <Link href={`mailto:${supportEmail}`} style={linkStyle}>
              {supportEmail}
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => d?.subject || 'Notification from Home Care Headquarters',
  displayName: 'System Notification',
  previewData: {
    subject: 'Clock Out Reminder: Shift ending in 10 minutes',
    heading: 'Clock Out Reminder',
    bodyHtml: '<p>Hi Alex,</p><p>Your shift ends in 10 minutes. Please remember to clock out.</p>',
    supportEmail: 'support@homecareheadquarters.org',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0f172a' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }
const header = {
  background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)',
  padding: '28px 24px',
  borderRadius: '12px 12px 0 0',
}
const h1 = { color: '#ffffff', margin: 0, fontSize: '22px', fontWeight: 700 }
const card = {
  background: '#f9fafb',
  padding: '28px 24px',
  border: '1px solid #e5e7eb',
  borderTop: 'none',
  borderRadius: '0 0 12px 12px',
}
const content = { fontSize: '15px', lineHeight: '1.6', color: '#0f172a' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const fine = { fontSize: '12px', color: '#64748b', margin: '8px 0' }
const linkStyle = { color: '#2563eb', textDecoration: 'underline' }
