/**
 * @param widgetId the id of the captcha widget
 * @param whenRemove a function to execute when the captcha is removed (if it's removed)
 */
export function removeCaptcha(widgetId: string | null, whenRemove: () => void) {
  if (widgetId) {
    turnstile.remove(widgetId)
    whenRemove()
  }
}

/**
 * Renders the captcha.
 * @returns The `widgetId` and the `captchaPromise`.
 */
export function renderCaptcha() {
  type PromiseContext = {
    resolve: (token: string) => void
    reject: (error: Error) => void
  }

  const promiseContext: PromiseContext = {
    resolve: () => undefined,
    reject: () => new Error('Promise was not ready.')
  }

  /**
   * Returns the `token` string when captcha validation is successful
   * or throws an error when captcha validation fails with `errorCode`
   */
  const captchaPromise = new Promise<string>((resolve, reject) => {
    promiseContext.resolve = resolve
    promiseContext.reject = reject
  })

  const renderResult = turnstile.render('.cf-turnstile', {
    sitekey: import.meta.env.VITE_TURNSTILE_SITEKEY,
    retry: 'never',

    callback: (token: string) => {
      promiseContext.resolve(token)
    },

    'error-callback': (errorCode: string) => {
      promiseContext.reject(new Error(errorCode))
      return true
    }
  })

  return { widgetId: renderResult, captchaPromise }
}
