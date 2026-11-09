/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22';
import { trainingLinkDetails } from './training-link-details.ts';
const palette = { background: '#ffffff', foreground: '#172033', secondary: '#475569', action: '#2563EB', actionText: '#ffffff' };
export interface TrainingLinkProps { confirmationUrl: string; siteName?: string; sentAt?: string; expiration?: string; confirmEmail?: boolean }
export function TrainingLinkEmail({ confirmationUrl, siteName = 'Home Care Headquarters', sentAt = trainingLinkDetails().sentAt, expiration = trainingLinkDetails().expiration, confirmEmail = false }: TrainingLinkProps) {
  return <Html lang="en" dir="ltr"><Head>
    <meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" />
    <style>{` :root { color-scheme: light dark; supported-color-schemes: light dark; }
      .training-link-button { background-color: ${palette.action} !important; background-image: linear-gradient(${palette.action}, ${palette.action}) !important; color: ${palette.actionText} !important; }
      .training-link-label { color: ${palette.actionText} !important; -webkit-text-fill-color: ${palette.actionText} !important; font-weight: 700 !important; }
      @media (prefers-color-scheme: dark) { .training-link-button { background-color: ${palette.action} !important; color: ${palette.actionText} !important; } }
      [data-ogsc] .training-link-button, [data-ogsb] .training-link-button { background-color: ${palette.action} !important; color: ${palette.actionText} !important; }
      u + .training-email-body .gmail-screen { background: #000000; mix-blend-mode: screen; }
      u + .training-email-body .gmail-difference { background: #000000; mix-blend-mode: difference; }
    `}</style>
  </Head><Preview>Sent {sentAt}. Your training sign-in link works once and expires in {expiration}.</Preview>
  <Body className="training-email-body" style={{ backgroundColor: palette.background, fontFamily: 'Inter, Roboto, Arial, sans-serif', color: palette.foreground }}>
    <Container style={{ padding: '24px', maxWidth: '560px' }}>
      <Text style={{ fontSize: '14px', color: palette.secondary, margin: '0 0 16px' }}>Sent {sentAt}</Text>
      <Heading style={{ fontSize: '22px', lineHeight: '30px', margin: '0 0 20px' }}>Your training sign-in link</Heading>
      <Text style={{ fontSize: '16px', lineHeight: '24px' }}>{confirmEmail ? 'Confirm your email and sign in to' : 'Sign in to'} {siteName === 'Home Care Headquaters' ? 'Home Care Headquarters' : siteName}. No password is needed.</Text>
      <Button className="training-link-button" href={confirmationUrl} style={{ backgroundColor: palette.action, backgroundImage: `linear-gradient(${palette.action}, ${palette.action})`, color: palette.actionText, border: `1px solid ${palette.action}`, borderRadius: '6px', padding: '14px 24px', fontSize: '16px', fontWeight: 700, lineHeight: '20px', minHeight: '44px', textDecoration: 'none', textAlign: 'center' }}>
        <span className="gmail-screen"><span className="gmail-difference"><span className="training-link-label" style={{ color: palette.actionText, fontWeight: 700 }}>Sign in to training</span></span></span>
      </Button>
      <Text style={{ fontSize: '15px', lineHeight: '23px', margin: '24px 0 8px' }}>Button not working? Copy and paste this link into your browser:</Text>
      <Text style={{ fontSize: '14px', lineHeight: '22px', color: palette.foreground, overflowWrap: 'anywhere', wordBreak: 'break-all', margin: '0 0 24px' }}>{confirmationUrl}</Text>
      <Text style={{ fontSize: '15px', lineHeight: '23px' }}>This link works once and expires in {expiration}. If you asked for more than one, use the newest email.</Text>
      <Text style={{ fontSize: '13px', lineHeight: '20px', color: palette.secondary }}>If you didn't request this link, you can ignore this email.</Text>
    </Container>
  </Body></Html>;
}
