import React, { useState, useEffect, useRef } from 'react';
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
  sublabel: string;
  status: 'pending' | 'active' | 'completed';
  progress: string;
}

export function GenerateStep({ onComplete, onCancel }: GenerateStepProps) {
  const [progress, setProgress] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [items, setItems] = useState<ProgressItem[]>([
    { id: 'pi1', label: 'Loading Templates', sublabel: 'Initializing context...', status: 'completed', progress: 'Done' },
    { id: 'pi2', label: 'Analyzing Requirements', sublabel: 'Processing input text...', status: 'pending', progress: 'Pending' },
    { id: 'pi3', label: 'Compliance Validation', sublabel: 'Checking DGA + NCA rules...', status: 'pending', progress: 'Pending' },
    { id: 'pi4', label: 'Generating Outputs', sublabel: 'Creating work items...', status: 'pending', progress: 'Pending' },
  ]);

  // Time elapsed counter
  useEffect(() => {
    processingTimerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
    };
  }, []);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 2, 100);
        
        // Update token count
        setTokenCount(Math.floor((newProgress / 100) * 3847));
        
        // Update items based on progress
        setItems(current => {
          const updated = [...current];
          
          // Step 1: Loading Templates (0-25%)
          if (newProgress >= 25) {
            updated[0] = { ...updated[0], status: 'completed', progress: 'Done' };
          }
          
          // Step 2: Analyzing Requirements (25-50%)
          if (newProgress >= 25 && newProgress < 50) {
            updated[1] = { ...updated[1], status: 'active', progress: `${Math.round(((newProgress - 25) / 25) * 100)}%` };
          } else if (newProgress >= 50) {
            updated[1] = { ...updated[1], status: 'completed', progress: 'Done' };
          }
          
          // Step 3: Compliance Validation (50-75%)
          if (newProgress >= 50 && newProgress < 75) {
            updated[2] = { ...updated[2], status: 'active', progress: `${Math.round(((newProgress - 50) / 25) * 100)}%` };
          } else if (newProgress >= 75) {
            updated[2] = { ...updated[2], status: 'completed', progress: 'Done' };
          }
          
          // Step 4: Generating Outputs (75-100%)
          if (newProgress >= 75 && newProgress < 100) {
            updated[3] = { ...updated[3], status: 'active', progress: `${Math.round(((newProgress - 75) / 25) * 100)}%` };
          } else if (newProgress >= 100) {
            updated[3] = { ...updated[3], status: 'completed', progress: 'Done' };
          }
          
          return updated;
        });
        
        if (newProgress >= 100) {
          clearInterval(interval);
          if (processingTimerRef.current) {
            clearInterval(processingTimerRef.current);
          }
          setTimeout(onComplete, 500);
        }
        
        return newProgress;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [onComplete]);

  const handleCancel = () => {
    if (confirm('Cancel generation? Your draft has been saved.')) {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
      onCancel();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      {/* CATY Avatar */}
      <div className="w-[88px] h-[88px] bg-gradient-to-br from-primary to-teal-500 rounded-[22px] flex items-center justify-center mb-7 shadow-[0_12px_40px_rgba(37,99,235,0.3)] animate-pulse">
        <Bot className="w-10 h-10 text-white" />
      </div>
      
      <h2 className="text-[22px] font-semibold mb-1.5">
        <span className="text-primary">CATY</span> is generating
      </h2>
      <p className="text-sm text-muted-foreground mb-9">Analyzing requirements and applying templates...</p>
      
      {/* Progress Card */}
      <div className="w-full max-w-[540px] bg-card border rounded-xl overflow-hidden">
        {/* Progress Items */}
        <div className="divide-y">
          {items.map(item => (
            <div key={item.id} className={cn(
              "flex items-center gap-4 px-5 py-[18px] transition-colors",
              item.status === 'completed' && "bg-emerald-50",
              item.status === 'active' && "bg-primary/5",
              item.status === 'pending' && "bg-transparent"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-[10px] flex items-center justify-center text-[15px]",
                item.status === 'completed' && "bg-emerald-500 text-white",
                item.status === 'active' && "bg-primary text-white",
                item.status === 'pending' && "bg-muted text-muted-foreground"
              )}>
                {item.status === 'completed' ? (
                  <Check className="w-5 h-5" />
                ) : item.status === 'active' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="text-xs">—</span>
                )}
              </div>
              <div className="flex-1">
                <h4 className={cn(
                  "text-sm font-medium",
                  item.status === 'pending' && "text-muted-foreground"
                )}>
                  {item.label}
                </h4>
                <p className="text-xs text-muted-foreground">{item.sublabel}</p>
              </div>
              <span className={cn(
                "text-[13px] font-medium",
                item.status === 'completed' && "text-emerald-600",
                item.status === 'active' && "text-primary",
                item.status === 'pending' && "text-muted-foreground"
              )}>
                {item.progress}
              </span>
            </div>
          ))}
        </div>
        
        {/* Overall Progress */}
        <div className="p-5 bg-muted/30">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] text-muted-foreground">Progress</span>
            <strong className="text-xl font-bold">{progress}%</strong>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-[10px] bg-muted rounded-[5px] overflow-hidden mb-3">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-teal-500 rounded-[5px] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{ 
                animation: 'shimmer 1.5s infinite',
                backgroundSize: '200% 100%'
              }}
            />
          </div>
          
          {/* Meta */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tokens: {tokenCount.toLocaleString()} / 4,000</span>
            <span>{formatTime(elapsedSeconds)} elapsed</span>
          </div>
        </div>
      </div>
      
      <Button variant="ghost" onClick={handleCancel} className="mt-6">
        Cancel
      </Button>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
