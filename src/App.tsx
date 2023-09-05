import { FormEvent, useEffect, useRef, useState } from 'react'

import './App.css'
import { createSessionSynchronizer } from './session-sync'
import { validate_email } from './validators'
import { ValidationError, formalizeErrors } from './lib/error-handling'

function App() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const emailFieldDirty = useRef(false)
  const isTurnstileReady = useRef(false)
  const saveAbortController = useRef<AbortController | undefined>(undefined)
  const turnstileWidgetId = useRef<string | null>(null)

  function updateErrors(errors: ValidationError[]) {
    if (errors.length === 0) {
      errors
    }

    setErrors(formalizeErrors(errors))
  }

  const saveForm = (token: string) => {
    const post = async () => {
      if (sessionStorage.getItem('x-session') === null) {
        updateErrors([
          {
            key: 'csrf',
            message:
              'Could not save form. Please reload the page and try again.'
          }
        ])
        return
      }

      saveAbortController.current = new AbortController()

      try {
        const resp = await fetch('http://localhost:4000/api/form', {
          body: JSON.stringify({ email: email, captcha_token: token }),
          method: 'POST',
          signal: saveAbortController.current?.signal,
          credentials: 'include',
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-csrf-token': sessionStorage.getItem('x-session') ?? ''
          }
        })

        if (resp.status === 200) {
          updateErrors([])
        } else {
          const error = await resp.json()
          updateErrors(error.errors)
        }
      } catch (error) {
        updateErrors([
          {
            key: 'general:',
            message: 'Could not save form. Please try again later.'
          }
        ])
        console.error(error)
      }
    }

    post()
  }

  const renderCaptcha = () => {
    setIsValidating(true)

    if (turnstileWidgetId.current) {
      turnstile.remove(turnstileWidgetId.current)
      turnstileWidgetId.current = null
    }

    return turnstile.render('.cf-turnstile', {
      sitekey: import.meta.env.VITE_TURNSTILE_SITEKEY,
      retry: 'never',

      callback: (token: string) => {
        setIsValidating(false)
        saveForm(token)
      },

      'error-callback': (errorCode: string) => {
        console.error(errorCode)

        return true
      }
    })
  }

  useEffect(() => {
    const { controller: syncAbortController, sync } =
      createSessionSynchronizer()

    sync()

    turnstile.ready(() => {
      isTurnstileReady.current = true
    })

    return () => {
      if (turnstileWidgetId.current) turnstile.remove(turnstileWidgetId.current)

      if (saveAbortController.current) {
        saveAbortController.current.abort()
        saveAbortController.current = undefined
      }
      syncAbortController.abort()
    }
  }, [])

  const onEmailBlur = () => {
    if (email.trim() !== '') {
      emailFieldDirty.current = true
    }
  }

  const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    setEmail(newValue)

    if (emailFieldDirty.current) {
      const validationResult = validate_email(newValue)

      if (validationResult !== true) {
        updateErrors([{ key: 'email', message: validationResult }])
      } else {
        updateErrors([])
      }
    }
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isTurnstileReady.current) {
      updateErrors([
        {
          key: 'general:',
          message: 'Captcha is not ready. Please wait a little moment...'
        }
      ])
      return
    }

    const validationResult = validate_email(email)

    if (validationResult !== true) {
      updateErrors([{ key: 'email', message: validationResult }])
      return
    }

    turnstileWidgetId.current = renderCaptcha()
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">E-mail</label>
        <input
          type="email"
          placeholder="Your e-mail"
          value={email}
          onChange={onEmailChange}
          onBlur={onEmailBlur}
        />

        <button type="submit">
          Send {isValidating ? <span> ...</span> : ''}
        </button>
        <div className="cf-turnstile"></div>
      </form>
      {errors.length > 0 ? (
        <div className="validation-result">
          <ul>
            {errors.map((error) => (
              <li key={error.key}>{error.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        ''
      )}
    </>
  )
}

export default App
