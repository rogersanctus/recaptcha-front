export function validate_email(email?: string | null): string | true {
  if (!email) return 'is required'

  if (!email.match(/.+@.+/)) {
    return 'is invalid'
  }

  return true
}
