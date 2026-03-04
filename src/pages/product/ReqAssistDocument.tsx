/**
 * ReqAssistDocument — Document Detail (Stage A shell)
 * Route: /product/req-assist/:id
 */
import React from 'react';
import { useParams } from 'react-router-dom';

export default function ReqAssistDocument() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="req-assist-document" style={{ padding: '2rem' }}>
      <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.25rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
        Document Detail
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
        Document ID: {id}
      </p>
    </div>
  );
}
