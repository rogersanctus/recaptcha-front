declare global {
  interface RenderOptions {
    sitekey: string
    callback: (token: string) => void
  }

  const turnstile: {
    ready: (onready: () => void) => void
    render: (targetElement: string, options: RenderOptions) => void
  }
}

export {}
