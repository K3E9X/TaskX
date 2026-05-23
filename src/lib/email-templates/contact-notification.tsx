import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  fromEmail?: string
  subject?: string
  message?: string
}

const ContactNotificationEmail = ({ name, fromEmail, subject, message }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouveau message de contact — {subject || 'TaskX'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>📬 Nouveau message de contact</Heading>
        <Section style={card}>
          <Text style={label}>De</Text>
          <Text style={value}>{name || '—'} {fromEmail ? `<${fromEmail}>` : ''}</Text>
          <Text style={label}>Sujet</Text>
          <Text style={value}>{subject || '—'}</Text>
          <Text style={label}>Message</Text>
          <Text style={value}>{message || '—'}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactNotificationEmail,
  subject: (d: Record<string, any>) => `[Contact TaskX] ${d.subject || 'Nouveau message'}`,
  displayName: 'Contact — notification admin',
  previewData: { name: 'Alex', fromEmail: 'alex@example.com', subject: 'Question runbooks', message: 'Hello, …' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 16px' }
const card = { backgroundColor: '#f6f7f9', borderRadius: '8px', padding: '16px 20px' }
const label = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#888', margin: '12px 0 4px' }
const value = { fontSize: '14px', color: '#0a0a0a', margin: '0', whiteSpace: 'pre-wrap' as const }
