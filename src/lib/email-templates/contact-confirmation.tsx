import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'TaskX'

interface Props {
  name?: string
  subject?: string
  message?: string
}

const ContactConfirmationEmail = ({ name, subject, message }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nous avons bien reçu ton message — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Merci ${name} !` : 'Merci pour ton message !'}</Heading>
        <Text style={text}>
          Nous avons bien reçu ton message et te répondrons dans les meilleurs délais.
        </Text>
        {subject && (
          <Section style={card}>
            <Text style={label}>Sujet</Text>
            <Text style={value}>{subject}</Text>
            {message && <><Text style={label}>Message</Text><Text style={value}>{message}</Text></>}
          </Section>
        )}
        <Text style={footer}>— L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'Nous avons bien reçu ton message — TaskX',
  displayName: 'Contact — confirmation',
  previewData: { name: 'Alex', subject: 'Question sur les runbooks', message: 'Bonjour…' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.55', margin: '0 0 16px' }
const card = { backgroundColor: '#f6f7f9', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const label = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#888', margin: '0 0 4px' }
const value = { fontSize: '14px', color: '#0a0a0a', margin: '0 0 12px', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '12px', color: '#888', margin: '24px 0 0' }
