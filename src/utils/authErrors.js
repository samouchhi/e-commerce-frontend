import { validationMessage } from './apiErrors.js'

const responseMessage = (error) => {
  const message = error?.details?.message
  return typeof message === 'string' && message.trim().length <= 200 ? message.trim() : ''
}

export const authErrorMessage = (error, translate, { otp = false } = {}) => {
  if (error?.status === 422) return validationMessage(error, translate('login.genericError'))
  if (error?.status === 429) return responseMessage(error) || translate('login.tooManyAttempts')
  if (otp && [400, 401, 403, 410].includes(error?.status)) {
    return responseMessage(error) || translate('login.invalidOrExpiredCode')
  }
  if (error?.status === 403) return responseMessage(error) || translate('login.genericError')
  if (error?.status === 401) return translate('login.invalidCredentials')
  return translate('login.genericError')
}
