/**
 * AI Greeting Card - Personalized conversational greeting
 */

import React from 'react';

interface AIGreetingProps {
  userName: string;
  criticalCount: number;
}

export function AIGreeting({ userName, criticalCount }: AIGreetingProps) {
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="text-sm text-muted-foreground leading-relaxed p-4 bg-card rounded-xl border border-border shadow-sm mb-6">
      <strong className="text-foreground">{getTimeOfDay()}, {userName}.</strong>{' '}
      {criticalCount > 0 ? (
        <>
          You have{' '}
          <span className="text-destructive font-semibold">
            {criticalCount} critical item{criticalCount > 1 ? 's' : ''}
          </span>{' '}
          that need{criticalCount === 1 ? 's' : ''} attention. Here's where to start:
        </>
      ) : (
        <>You're all caught up! Here's your focus for today:</>
      )}
    </div>
  );
}
