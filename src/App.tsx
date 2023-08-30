import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import './App.css'
import { createSessionSynchronizer } from './session-sync'

interface ValidationError {
  key: string
  message: string
}

const formKeys = [{ key: 'email', identifier: 'The e-mail' }]

function formalizeErrors(errors: ValidationError[]): ValidationError[] {
  return errors.map(error => {
    const formKey = formKeys.find(fk => fk.key === error.key)
    const newError = {
      ...error
    }

    if (!formKey) {
      newError.message = error.key + ' ' + error.message
    } else {
      newError.message = formKey.identifier + ' ' + error.message
    }

    return newError
  })
}

function App() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<ValidationError[]>([])
  const captchaToken = useRef('')

  const onCaptchaValidate = useCallback((token: string) => {
    console.log(token)
    captchaToken.current = token
  }, [])

  useEffect(() => {
    const { controller, sync } = createSessionSynchronizer()

    sync()

    turnstile.ready(function () {
      turnstile.render('.cf-turnstile', {
        sitekey: '0x4AAAAAAAJZizZwYGzAMePM',
        callback: onCaptchaValidate
      })
    })

    return () => {
      controller.abort()
    }
  }, [onCaptchaValidate])

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      console.log('submited')

      const controller = new AbortController()
      const post = async () => {
        if (sessionStorage.getItem('x-session') === null) {
          return
        }

        const resp = await fetch('http://localhost:4000/api/form', {
          body: JSON.stringify({ email: email }),
          method: 'POST',
          signal: controller.signal,
          credentials: 'include',
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-token-recaptcha': sessionStorage.getItem('x-session') ?? ''
          }
        })

        if (resp.status === 200) {
          setErrors([])
          console.log('Sent and saved')
        } else {
          const error = await resp.json()
          console.log('Error', error)
          setErrors(formalizeErrors(error.errors))
        }
      }

      post()
    },
    [email]
  )

  return (
    <>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">E-mail</label>
        <input
          type="email"
          placeholder="Your e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <button type="submit">Send</button>
        <div className="cf-turnstile"></div>
      </form>
      {errors.length > 0 ? (
        <div className="validation-result">
          <ul>
            {errors.map(error => (
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
