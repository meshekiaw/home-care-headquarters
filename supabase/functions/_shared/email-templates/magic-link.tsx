/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName?: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName = "Home Care Headquarters",
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Your sign-in link for {siteName === "Home Care Headquaters" ? "Home Care Headquarters" : siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your training sign-in link</Heading>
        <Text style={text}>
          Open the link below to sign in to {siteName === "Home Care Headquaters" ? "Home Care Headquarters" : siteName}. No password is needed.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Continue to my training
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Roboto, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 15%, 45%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: 'hsl(217, 91%, 60%)',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid hsl(217, 91%, 60%)',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: 'hsl(215, 15%, 45%)', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: hsl(217, 91%, 60%) !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: hsl(217, 91%, 60%) !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: hsl(217, 91%, 60%) !important; color: #ffffff !important; }
`
