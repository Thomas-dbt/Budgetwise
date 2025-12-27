import { firebaseAuth } from '@/lib/firebase/client'

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  let token
  try {
    token = await firebaseAuth.currentUser?.getIdToken()
  } catch (tokenError) {
    token = null
  }
  const headers = new Headers(init.headers)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, { ...init, headers })
  return response
}
