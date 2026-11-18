export const validationErrors = (error) => {
  if (error?.status !== 422) return {}
  return Object.fromEntries(
    Object.entries(error.details?.errors || {})
      .map(([field, messages]) => [
        field,
        [messages]
          .flat()
          .filter((message) => typeof message === 'string' && message.trim())
          .map((message) => message.trim())
          .join(' '),
      ])
      .filter(([, message]) => message),
  )
}

export const validationMessage = (error, fallback = '') => {
  if (error?.status !== 422) return fallback
  return (
    Object.values(validationErrors(error)).join(' ') ||
    (typeof error.details?.message === 'string' && error.details.message.trim()) ||
    fallback
  )
}
