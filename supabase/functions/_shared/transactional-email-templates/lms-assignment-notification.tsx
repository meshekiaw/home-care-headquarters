import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
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

interface Course {
  title: string
  dueDate?: string | null
}

interface Props {
  firstName?: string
  courses?: Course[]
  loginUrl?: string
  supportEmail?: string
}

const Email = ({
  firstName = 'there',
  courses = [],
  loginUrl = 'https://homecareheadquarters.org/auth/magic-link',
  supportEmail = 'homcarenetwork4@gmail.com',
}: Props) => {
  const first = courses[0]?.title || 'a new course'
  const extra = courses.length > 1 ? ` (+${courses.length - 1} more)` : ''

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`New training assigned: ${first}${extra}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Training Assigned</Heading>
          </Section>

          <Section style={card}>
            <Text style={p}>Hi {firstName},</Text>
            <Text style={p}>
              You have {courses.length > 1 ? 'new training courses' : 'a new training course'} to complete
              in the Home Care Headquarters portal:
            </Text>

            <Section style={list}>
              {courses.map((c, i) => (
                <Section key={i} style={listItem}>
                  <Text style={courseTitle}>{c.title}</Text>
                  <Text style={courseMeta}>
                    {c.dueDate
                      ? `Due: ${new Date(c.dueDate).toLocaleDateString()}`
                      : 'No due date'}
                  </Text>
                </Section>
              ))}
            </Section>

            <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
              <Button href={loginUrl} style={button}>
                Continue to my training
              </Button>
            </Section>

            <Text style={helper}>
              This button signs you in securely — no password required. The link expires in
              one hour. If it stops working, ask your coordinator to resend it.
            </Text>

            <Hr style={hr} />

            <Text style={fine}>
              Trouble with the button? Copy this link into your browser:
              <br />
              <Link href={loginUrl} style={linkStyle}>
                {loginUrl}
              </Link>
            </Text>

            <Text style={fine}>
              Questions? Contact your coordinator at{' '}
              <Link href={`mailto:${supportEmail}`} style={linkStyle}>
                {supportEmail}
              </Link>
              . This inbox is not monitored.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => {
    const first = d?.courses?.[0]?.title || 'a new course'
    const extra = (d?.courses?.length || 0) > 1 ? ` (+${(d!.courses!.length) - 1} more)` : ''
    return `New training assigned: ${first}${extra}`
  },
  displayName: 'LMS Assignment Notification',
  previewData: {
    firstName: 'Alex',
    courses: [
      { title: 'HIPAA Privacy Basics', dueDate: '2026-08-01' },
      { title: 'Infection Control Refresher', dueDate: null },
    ],
    loginUrl: 'https://homecareheadquarters.org/auth/magic-link?token_hash=preview&type=magiclink&next=/my-training',
    supportEmail: 'homcarenetwork4@gmail.com',
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
const p = { fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px 0', color: '#0f172a' }
const list = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 16px' }
const listItem = { padding: '10px 0', borderBottom: '1px solid #f1f5f9' }
const courseTitle = { fontSize: '15px', fontWeight: 600, margin: 0, color: '#0f172a' }
const courseMeta = { fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }
const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '15px',
  textDecoration: 'none',
  display: 'inline-block',
}
const helper = { fontSize: '12px', color: '#64748b', textAlign: 'center' as const, margin: '4px 0 0 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const fine = { fontSize: '12px', color: '#64748b', lineHeight: '1.5', margin: '8px 0' }
const linkStyle = { color: '#2563eb', textDecoration: 'underline' }
