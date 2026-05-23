import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
})

type State =
  | { kind: 'loading' }
  | { kind: 'valid' }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

function UnsubscribePage() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token')
    : null

  useEffect(() => {
    if (!token) { setState({ kind: 'invalid' }); return }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) return setState({ kind: 'invalid' })
        if (data.valid === false && data.reason === 'already_unsubscribed') return setState({ kind: 'already' })
        if (data.valid) return setState({ kind: 'valid' })
        setState({ kind: 'invalid' })
      })
      .catch(() => setState({ kind: 'invalid' }))
  }, [token])

  const confirm = async () => {
    if (!token) return
    setState({ kind: 'submitting' })
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) return setState({ kind: 'error', message: data.error || 'Failed' })
      if (data.success || data.reason === 'already_unsubscribed') return setState({ kind: 'done' })
      setState({ kind: 'error', message: 'Unexpected response' })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Failed' })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Désabonnement TaskX</h1>
        <div className="mt-4 text-sm text-muted-foreground">
          {state.kind === 'loading' && 'Vérification du lien…'}
          {state.kind === 'invalid' && 'Lien invalide ou expiré.'}
          {state.kind === 'already' && 'Cet email est déjà désabonné.'}
          {state.kind === 'valid' && 'Confirme pour ne plus recevoir d\'emails de notre part.'}
          {state.kind === 'submitting' && 'Traitement…'}
          {state.kind === 'done' && '✅ Tu es désabonné. Plus aucun email ne te sera envoyé.'}
          {state.kind === 'error' && `Erreur : ${state.message}`}
        </div>
        {state.kind === 'valid' && (
          <button
            onClick={confirm}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Confirmer le désabonnement
          </button>
        )}
      </div>
    </div>
  )
}
