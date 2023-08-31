export function createSessionSynchronizer() {
  const controller = new AbortController()
  const sync = async () => {
    if (sessionStorage.getItem('x-session') !== null) {
      return
    }

    const resp = await fetch('http://localhost:4000/api/session', {
      method: 'GET',
      signal: controller.signal,
      credentials: 'include'
    })

    if (resp.status === 204) {
      const token = resp.headers.get('x-csrf-token')

      if (token !== null) {
        sessionStorage.setItem('x-session', token)
      }
    }
  }

  return {
    controller,
    sync
  }
}
