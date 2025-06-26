import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Spinner } from '@blueprintjs/core'
import api from '../network/api'

interface AuthGuardProps {
  children: React.ReactNode
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    api.get('/me')
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}><Spinner /></div>
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default AuthGuard 