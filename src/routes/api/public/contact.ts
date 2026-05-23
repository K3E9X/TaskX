import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'TaskX'
const SENDER_DOMAIN = 'notify.taskx.tech'
const FROM_DOMAIN = 'taskx.tech'
// Admin destination for contact form notifications. Change here if needed.
const ADMIN_EMAIL = 'contact@taskx.tech'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function enqueueEmail(
  supabase: any,
  templateName: string,
  recipient: string,
  data: Record<string, any>,
) {
  const tpl = TEMPLATES[templateName]
  if (!tpl) throw new Error(`Template ${templateName} not found`)

  const normalized = recipient.toLowerCase()
  const messageId = crypto.randomUUID()

  // Suppression check
  const { data: suppressed } = await supabase
    .from('suppressed_emails').select('id').eq('email', normalized).maybeSingle()
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: templateName, recipient_email: recipient, status: 'suppressed',
    })
    return { skipped: true }
  }

  // Unsubscribe token (one per email)
  let token: string
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens').select('token, used_at').eq('email', normalized).maybeSingle()
  if (existing && !existing.used_at) {
    token = existing.token as string
  } else {
    token = generateToken()
    await supabase.from('email_unsubscribe_tokens').upsert(
      { token, email: normalized }, { onConflict: 'email', ignoreDuplicates: true },
    )
    const { data: stored } = await supabase
      .from('email_unsubscribe_tokens').select('token').eq('email', normalized).maybeSingle()
    token = (stored?.token as string) || token
  }

  const element = React.createElement(tpl.component, data)
  const html = await render(element)
  const plainText = await render(element, { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject

  await supabase.from('email_send_log').insert({
    message_id: messageId, template_name: templateName, recipient_email: recipient, status: 'pending',
  })

  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: messageId,
      unsubscribe_token: token,
      queued_at: new Date().toISOString(),
    },
  })

  if (error) {
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: templateName, recipient_email: recipient,
      status: 'failed', error_message: error.message,
    })
    throw new Error(error.message)
  }
  return { skipped: false }
}

export const Route = createFileRoute('/api/public/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let body: any
        try { body = await request.json() } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const name = String(body?.name ?? '').trim().slice(0, 200)
        const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 320)
        const subject = String(body?.subject ?? '').trim().slice(0, 300)
        const message = String(body?.message ?? '').trim().slice(0, 5000)

        if (!name || !email || !subject || !message) {
          return Response.json({ error: 'Missing fields' }, { status: 400 })
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return Response.json({ error: 'Invalid email' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error: insertError } = await supabase
          .from('contact_submissions')
          .insert({ name, email, subject, message })
        if (insertError) {
          console.error('contact insert failed', insertError)
          return Response.json({ error: 'Failed to save message' }, { status: 500 })
        }

        // Fire confirmation to user + notification to admin (best-effort; never block on errors)
        const results = await Promise.allSettled([
          enqueueEmail(supabase, 'contact-confirmation', email, { name, subject, message }),
          enqueueEmail(supabase, 'contact-notification', ADMIN_EMAIL, {
            name, fromEmail: email, subject, message,
          }),
        ])
        results.forEach((r, i) => {
          if (r.status === 'rejected') console.error(`contact email ${i} failed`, r.reason)
        })

        return Response.json({ success: true })
      },
    },
  },
})
