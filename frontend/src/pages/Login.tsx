import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormGroup, InputGroup, Button, Intent, Spinner } from '@blueprintjs/core'
import api from '../network/api'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Auto-redirect if already authenticated
  useEffect(() => {
    api.get('/me')
      .then(() => navigate('/dashboard'))
      .catch(() => {})
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/login', { email, password })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <form className="glass-panel" style={{ width: '100%', maxWidth: 360, padding: 24 }} onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: 16, color: 'var(--glass-text-primary)' }}>Log In</h2>
        <FormGroup label="Email" labelFor="login-email">
          <InputGroup
            id="login-email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
        </FormGroup>

        <FormGroup label="Password" labelFor="login-password">
          <InputGroup
            id="login-password"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
        </FormGroup>

        {error && <div style={{ color: 'var(--glass-danger)', marginBottom: 12 }}>{error}</div>}

        <Button
          type="submit"
          className="glass-btn glass-btn-primary"
          style={{
            height: '50px',
            width: '200px',
            fontSize: '1.1rem',
            fontWeight: 600
          }}
          disabled={loading}
          large
        >
          {loading ? <Spinner size={16} /> : 'Log In'}
        </Button>
      </form>
    </div>
  )
}

export default Login 