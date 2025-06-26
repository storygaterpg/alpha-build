import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, H2, H5, Divider } from '@blueprintjs/core'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  // Placeholder data; replace with real API calls as needed
  const campaigns = [
    { id: '1', title: 'Dungeon of Doom' },
    { id: '2', title: 'Forest of Mysteries' }
  ]
  const friendsOnline = ['Alice', 'Bob', 'Charlie']

  return (
    <div className="dashboard-container" style={{ padding: '2rem' }}>
      <H2>Your Campaigns</H2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {campaigns.map(c => (
          <Card key={c.id} elevation={2} style={{ width: '200px' }}>
            <H5 style={{ marginTop: 0 }}>{c.title}</H5>
          </Card>
        ))}
      </div>

      <Divider />

      <H2>Friends Online</H2>
      <ul style={{ marginBottom: '1rem' }}>
        {friendsOnline.map(name => (
          <li key={name}>{name}</li>
        ))}
      </ul>

      <Divider />

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button
          intent="primary"
          large
          onClick={() => navigate('/create-game')}
        >
          Create New Game
        </Button>
        <Button
          intent="success"
          large
          onClick={() => navigate('/search-party')}
        >
          Search for a Party
        </Button>
      </div>
    </div>
  )
}

export default Dashboard 