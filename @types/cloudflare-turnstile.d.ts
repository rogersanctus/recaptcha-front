declare global {
  interface RenderOptions {
    sitekey: string
    action?: string
    retry?: 'never' | 'auto'
    'retry-interval'?: number
    callback?: (token: string) => void
    'error-callback'?: (errorCode: string) => boolean
  }

  const turnstile: {
    ready: (onready: () => void) => void
    render: (targetElement: string, options: RenderOptions) => string
    remove: (widgetId: string) => void
  }
}

export {}
