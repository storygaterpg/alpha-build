import React, { useState } from 'react';
import { Button, Card, FormGroup, InputGroup, H3, Callout, HTMLSelect } from '@blueprintjs/core';
import context7Service from '../services/context7Service';

const Context7Test: React.FC = () => {
  const [libraryName, setLibraryName] = useState('react');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryId, setLibraryId] = useState<string | null>(null);

  const libraries = [
    { label: 'React', value: 'react' },
    { label: 'Next.js', value: 'next.js' },
    { label: 'Redux', value: 'redux' },
    { label: 'Phaser', value: 'phaser' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // First, resolve the library ID
      const resolvedLibraryId = await context7Service.resolveLibraryId(libraryName);
      setLibraryId(resolvedLibraryId);
      
      // Then get the documentation
      const docs = await context7Service.getLibraryDocs(
        resolvedLibraryId,
        query,
        { tokens: 5000 }
      );
      
      setResult(docs);
    } catch (err) {
      setError('Error connecting to Context7');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={2} style={{ maxWidth: '500px', margin: '0 auto' }}>
      <H3>Context7 Test</H3>
      
      <form onSubmit={handleSubmit}>
        <FormGroup
          label="Select a library:"
          labelFor="library-select"
        >
          <HTMLSelect
            id="library-select"
            value={libraryName}
            onChange={(e) => setLibraryName(e.target.value)}
            options={libraries}
            disabled={loading}
            fill
          />
        </FormGroup>
        
        <FormGroup
          label="Enter your query:"
          labelFor="context7-query"
        >
          <InputGroup
            id="context7-query"
            placeholder="e.g., How do I use React hooks?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
        </FormGroup>
        
        <Button 
          type="submit" 
          intent="primary" 
          loading={loading}
          disabled={loading}
        >
          Test Context7
        </Button>
      </form>

      {libraryId && (
        <Callout intent="primary" title="Library ID" style={{ marginTop: '1rem' }}>
          {libraryId}
        </Callout>
      )}

      {error && (
        <Callout intent="danger" title="Error" style={{ marginTop: '1rem' }}>
          {error}
        </Callout>
      )}
      
      {result && !error && (
        <Callout intent="success" title="Result" style={{ marginTop: '1rem' }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {result}
          </pre>
        </Callout>
      )}
    </Card>
  );
};

export default Context7Test; 