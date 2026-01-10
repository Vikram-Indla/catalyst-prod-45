import React, { useState, useEffect } from 'react';
import { Bot, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GenerateStepProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface ProgressItem {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  progress: string;
}

export function GenerateStep({ onComplete, onCancel }: GenerateStepProps) {
  const [progress, setProgress] = useState(0);
  const [tokenCount, setTokenCount] = useState(1247);
  const [items, setItems] = useState<ProgressItem[]>([
    { id: 'pi1', label: 'Loading Templates', status: 'active', progress: '0%' },
    { id: 'pi2', label: 'Analyzing Requirements', status: 'pending', progress: 'Waiting' },
    { id: 'pi3', label: 'Compliance Validation', status: 'pending', progress: 'Waiting' },
    { id: 'pi4', label: 'Generating Outputs', status: 'pending', progress: 'Waiting' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 2, 100);
        
        // Update token count
        setTokenCount(Math.floor(1247 + (newProgress / 100) * 2600));
        
        // Update items
        setItems(current => {
          const updated = [...current];
          
          if (newProgress >= 25) {
            updated[0] = { ...updated[0], status: 'completed', progress: 'Done' };
          } else {
            updated[0] = { ...updated[0], status: 'active', progress: `${Math.round((newProgress / 25) * 100)}%` };
          }
          
          if (newProgress >= 25 && newProgress < 50) {
            updated[1] = { ...updated[1], status: 'active', progress: `${Math.round(((newProgress - 25) / 25) * 100)}%` };
          } else if (newProgress >= 50) {
            updated[1] = { ...updated[1], status: 'completed', progress: 'Done' };
          }
          
          if (newProgress >= 50 && newProgress < 75) {
            updated[2] = { ...updated[2], status: 'active', progress: `${Math.round(((newProgress - 50) / 25) * 100)}%` };
          } else if (newProgress >= 75) {
            updated[2] = { ...updated[2], status: 'completed', progress: 'Done' };
          }
          
          if (newProgress >= 75 && newProgress < 100) {
            updated[3] = { ...updated[3], status: 'active', progress: `${Math.round(((newProgress - 75) / 25) * 100)}%` };
          } else if (newProgress >= 100) {
            updated[3] = { ...updated[3], status: 'completed', progress: 'Done' };
          }
          
          return updated;
        });
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
        }
        
        return newProgress;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      {/* CATY Avatar */}
      <div className="w-[88px] h-[88px] bg-gradient-to-br from-primary to-teal-500 rounded-full flex items-center justify-center mb-7 shadow-lg animate-pulse">
        <Bot className="w-10 h-10 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold mb-1.5">
        <span className="text-primary">CATY</span> is generating
      </h2>
      <p className="text-muted-foreground mb-8">Analyzing requirements and applying templates...</p>
      
      {/* Progress Card */}
      <div className="w-full max-w-lg bg-card border rounded-xl p-6">
        <div className="space-y-4 mb-6">
          {items.map(item => (
            <div key={item.id} className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              item.status === 'completed' && "bg-emerald-50",
              item.status === 'active' && "bg-primary/5",
              item.status === 'pending' && "bg-muted/30"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                item.status === 'completed' && "bg-emerald-500 text-white",
                item.status === 'active' && "bg-primary text-white",
                item.status === 'pending' && "bg-muted"
              )}>
                {item.status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : item.status === 'active' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <span className={cn(
                "flex-1 text-sm font-medium",
                item.status === 'pending' && "text-muted-foreground"
              )}>
                {item.label}
              </span>
              <span className={cn(
                "text-xs font-medium",
                item.status === 'completed' && "text-emerald-600",
                item.status === 'active' && "text-primary",
                item.status === 'pending' && "text-muted-foreground"
              )}>
                {item.progress}
              </span>
            </div>
          ))}
        </div>
        
        {/* Progress Bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
        
        {/* Meta */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Tokens: {tokenCount.toLocaleString()} / 4,000</span>
          <span>{Math.floor(progress / 10)}s elapsed</span>
        </div>
      </div>
      
      <Button variant="ghost" onClick={onCancel} className="mt-6">
        Cancel
      </Button>
    </div>
  );
}
