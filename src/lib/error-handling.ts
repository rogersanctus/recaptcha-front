export interface ValidationError {
  key: string
  message: string
}

const formKeys = [{ key: 'email', identifier: 'The e-mail' }]

export function formalizeErrors(errors: ValidationError[]): ValidationError[] {
  return errors.map((error) => {
    const formKey = formKeys.find((fk) => fk.key === error.key)
    const newError = {
      ...error
    }

    if (!formKey) {
      newError.message = error.message
    } else {
      newError.message = formKey.identifier + ' ' + error.message
    }

    return newError
  })
}
