const CODE_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Email ou mot de passe incorrect',
  USER_ALREADY_EXISTS: 'Un compte existe déjà avec cet email',
  USER_NOT_FOUND: 'Aucun compte trouvé avec cet email',
  EMAIL_NOT_VERIFIED: 'Email non vérifié',
  PASSWORD_TOO_SHORT: 'Mot de passe trop court (8 caractères minimum)',
  PASSWORD_TOO_LONG: 'Mot de passe trop long',
  INVALID_EMAIL: 'Adresse email invalide',
  INVALID_PASSWORD: 'Mot de passe incorrect',
  FAILED_TO_CREATE_USER: 'Impossible de créer le compte',
  FAILED_TO_CREATE_SESSION: 'Impossible de créer la session',
  FAILED_TO_GET_SESSION: 'Session introuvable',
  USERNAME_ALREADY_TAKEN: 'Ce nom d\'utilisateur est déjà utilisé',
  SESSION_EXPIRED: 'Session expirée, reconnecte-toi',
  UNAUTHORIZED: 'Non autorisé'
}

export function formatAuthError(err: unknown): string {
  const e = err as { data?: { code?: string, message?: string }, statusCode?: number, status?: number, message?: string }
  const code = e?.data?.code
  const rawMessage = e?.data?.message || e?.message
  const status = e?.statusCode ?? e?.status

  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code]

  if (rawMessage) {
    const lower = rawMessage.toLowerCase()
    if (lower.includes('already exists') || lower.includes('already registered')) {
      return 'Un compte existe déjà avec cet email'
    }
    if (lower.includes('invalid') && lower.includes('password')) {
      return 'Email ou mot de passe incorrect'
    }
    if (lower.includes('invalid') && lower.includes('email')) {
      return 'Adresse email invalide'
    }
    if (lower.includes('password') && (lower.includes('short') || lower.includes('length'))) {
      return 'Mot de passe trop court (8 caractères minimum)'
    }
    if (lower.includes('unique') || lower.includes('duplicate')) {
      if (lower.includes('username')) return 'Ce nom d\'utilisateur est déjà pris'
      if (lower.includes('email')) return 'Un compte existe déjà avec cet email'
      return 'Cette information est déjà utilisée'
    }
    if (lower.includes('network') || lower.includes('failed to fetch')) {
      return 'Impossible de joindre le serveur'
    }
  }

  if (status === 401 || status === 403) return 'Email ou mot de passe incorrect'
  if (status === 404) return 'Ressource introuvable'
  if (status === 422) return 'Données invalides'
  if (status === 429) return 'Trop de tentatives, réessaie dans quelques instants'
  if (typeof status === 'number' && status >= 500) return 'Erreur serveur, réessaie plus tard'

  return rawMessage || 'Une erreur est survenue'
}
