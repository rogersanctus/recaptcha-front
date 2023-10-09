import { FormEvent, useEffect, useRef, useState } from 'react'

import './App.css'
import { createSessionSynchronizer } from './session-sync'
import { validate_email } from './lib/validators'
import { ValidationError, formalizeErrors } from './lib/error-handling'
import { CaptchaError, removeCaptcha, renderCaptcha } from './lib/captcha'
import { toast } from 'react-toastify'

function App() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [errorsMap, setErrorsMap] = useState<Record<string, ValidationError>>(
    {}
  )
  const [isValidating, setIsValidating] = useState(false)
  const [isShowingCaptchaValidator, setIsShowingCaptchaValidator] =
    useState(false)
  const emailFieldDirty = useRef(false)
  const isTurnstileReady = useRef(false)
  const saveAbortController = useRef<AbortController | undefined>(undefined)
  const turnstileWidgetId = useRef<string | null>(null)

  function updateErrors(errors: ValidationError[]) {
    if (!errors || errors.length === 0) {
      setErrors([])
      setErrorsMap({})
      return
    }

    if (!Array.isArray(errors)) {
      errors = [errors]
    }

    const newErrors = formalizeErrors(errors)
    const newErrorsMap: Record<string, ValidationError> = {}

    for (const error of newErrors) {
      newErrorsMap[error.key] = error
    }

    setErrorsMap(newErrorsMap)
    setErrors(newErrors)
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
        console.error(
          'The session could not be retrieved and stored in the session storage. The CSRF token is not set.'
        )
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

        if (resp.ok) {
          updateErrors([])

          toast.success('Thank you for submitting the form =).', {
            theme: 'colored'
          })

          setEmail('')
          turnstileWidgetId.current &&
            turnstile.remove(turnstileWidgetId.current)
        } else {
          const error = await resp.json()

          if (
            (error.errors as ValidationError[]).find((e) => e.key === 'csrf')
          ) {
            const { sync } = createSessionSynchronizer()

            sessionStorage.removeItem('x-session')
            sync()

            updateErrors([
              {
                key: 'csrf',
                message:
                  'This form is open for a long time. For your safety, its internal state was reloaded. Please try to send it now.'
              }
            ])
          } else {
            updateErrors(error.errors)
          }
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

    setIsShowingCaptchaValidator(true)

    const validationResult = validate_email(email)

    if (validationResult !== true) {
      updateErrors([{ key: 'email', message: validationResult }])
      return
    }

    // Makes the render captcha call after its wrapper element is rendered
    setTimeout(async () => {
      removeCaptcha(
        turnstileWidgetId.current,
        () => (turnstileWidgetId.current = null)
      )

      const { widgetId, captchaPromise } = renderCaptcha()
      turnstileWidgetId.current = widgetId

      setIsValidating(true)
      try {
        const token = await captchaPromise
        saveForm(token)
      } catch (error) {
        if (error instanceof CaptchaError) {
          updateErrors([
            {
              key: 'captcha',
              message:
                'Fail on captcha validation. Please refresh the page and try it again.'
            }
          ])
          console.error('That was a catpcha error', error.errorCode)
        } else {
          console.error(error)
        }
      } finally {
        setIsValidating(false)
      }
    }, 0)
  }

  return (
    <div className="flex flex-col items-center justify-center bg-zinc-1 h-screen">
      <form
        onSubmit={onSubmit}
        className="border rounded-4 bg-sky-800 p-8 text-white flex flex-col gap-8 w-9/10 lg:w-2/3 xl:w-1/3">
        <h1 className="text-lg font-bold uppercase text-center">
          Captcha Test
        </h1>
        <div className="">
          <label
            htmlFor="email"
            className="block text-sm font-bold text-zinc-100">
            E-mail
          </label>
          <input
            type="email"
            name="email"
            placeholder="Your e-mail"
            value={email}
            className={`w-full rounded border-2 mt-2 px-4 py-2 text-zinc-600 outline-none focus:ring-2
              ${
                !errorsMap['email'] ? 'border-slate-300 focus:ring-sky-300' : ''
              }
              ${
                errorsMap['email'] ? ' border-red-400 focus:ring-red-400' : ''
              }`}
            onChange={onEmailChange}
            onBlur={onEmailBlur}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-1 text-lg px-4 py-2 font-semibold uppercase outline-none border border-lime-500 bg-lime-400 drop-shadow focus:bg-lime-500 focus:border-lime-600 hover:bg-lime-500 hover:border-lime-600">
          Send {isValidating ? <span> ...</span> : ''}
        </button>
        {isShowingCaptchaValidator && (
          <div className="cf-turnstile text-center inline-flex justify-center"></div>
        )}
        {errors.length > 0 ? (
          <div className="validation-result text-center text-lg text-red-300 font-semibold">
            <ul>
              {errors.map((error) => (
                <li key={error.key}>{error.message}</li>
              ))}
            </ul>
          </div>
        ) : (
          ''
        )}
      </form>
    </div>
  )
}

export default App
