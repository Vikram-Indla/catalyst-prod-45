/**
 * Test Execution Page - V5 Spec Implementation
 * Route: /releases/execution
 * 
 * Three-panel layout:
 * - Left: Test Queue (360px)
 * - Right: Execution Panel (flex-1)
 * 
 * Features:
 * - Cycle selector with progress ring
 * - Filter chips (All, Not Run, Passed, Failed, Blocked)
 * - Real-time timer
 * - Step-by-step execution with pass/fail/blocked/skip
 * - Keyboard shortcuts
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Search,
  Play,
  Clock,
  Pause,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  Bug,
  Camera,
  Paperclip,
  MessageSquare,
  RefreshCw,
  Ban,
} from 'lucide-react';

// Mock data
const mockCycles = [
  { id: 'cy-1', key: 'CY-26.01.01-02', name: 'Regression Suite', progress: 68, total: 50, completed: 34, passRate: 82 },
  { id: 'cy-2', key: 'CY-26.01.01-03', name: 'Sprint 12 Testing', progress: 45, total: 28, completed: 13, passRate: 77 },
  { id: 'cy-3', key: 'CY-26.01.01-04', name: 'Security Audit', progress: 20, total: 15, completed: 3, passRate: 100 },
];

const mockTestCases = [
  { id: 'tc-1', key: 'TC-1026', title: 'User login with valid credentials', priority: 'critical', module: 'Authentication', status: 'passed', steps: 8, estimatedTime: 5 },
  { id: 'tc-2', key: 'TC-1027', title: 'User login with invalid password', priority: 'high', status: 'passed', module: 'Authentication', steps: 4, estimatedTime: 3 },
  { id: 'tc-3', key: 'TC-1028', title: 'Password reset email sent', priority: 'high', status: 'failed', module: 'Authentication', steps: 6, estimatedTime: 4 },
  { id: 'tc-4', key: 'TC-1029', title: 'Session timeout after inactivity', priority: 'medium', status: 'not_run', module: 'Session', steps: 5, estimatedTime: 8 },
  { id: 'tc-5', key: 'TC-1030', title: 'Multi-factor authentication flow', priority: 'critical', status: 'not_run', module: 'Security', steps: 10, estimatedTime: 12 },
  { id: 'tc-6', key: 'TC-1031', title: 'API rate limiting verification', priority: 'high', status: 'not_run', module: 'Security', steps: 6, estimatedTime: 7 },
  { id: 'tc-7', key: 'TC-1032', title: 'SQL injection prevention', priority: 'critical', status: 'blocked', module: 'Security', steps: 8, estimatedTime: 10 },
  { id: 'tc-8', key: 'TC-1033', title: 'XSS attack prevention', priority: 'critical', status: 'not_run', module: 'Security', steps: 7, estimatedTime: 8 },
];

const mockSteps = [
  { id: 1, action: 'Navigate to the login page at https://app.catalyst.gov.sa/login', expected: 'Login page loads with email and password fields visible', status: 'passed' },
  { id: 2, action: 'Enter valid email address in the email field', expected: 'Email is accepted without validation errors', status: 'passed' },
  { id: 3, action: 'Enter valid password in the password field', expected: 'Password is masked with dots', status: 'failed' },
  { id: 4, action: 'Click the "Sign In" button', expected: 'Button shows loading spinner', status: 'not_run' },
  { id: 5, action: 'Wait for authentication to complete', expected: 'System validates credentials within 3 seconds', status: 'not_run' },
  { id: 6, action: 'Observe the redirect behavior', expected: 'User is redirected to the Dashboard page', status: 'not_run' },
  { id: 7, action: 'Verify user session is created', expected: 'User avatar and name appear in header', status: 'not_run' },
  { id: 8, action: 'Check browser console for errors', expected: 'No JavaScript errors in the console', status: 'not_run' },
];

type FilterType = 'all' | 'not_run' | 'passed' | 'failed' | 'blocked';

export default function ExecutionPage() {
  const navigate = useNavigate();
  
  // State
  const [selectedCycleId, setSelectedCycleId] = useState(mockCycles[0].id);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(mockTestCases[3].id);
  const [currentStepIndex, setCurrentStepIndex] = useState(3);
  const [steps, setSteps] = useState(mockSteps);
  
  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(154);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  
  // Find selected cycle and test
  const selectedCycle = mockCycles.find(c => c.id === selectedCycleId);
  const selectedTest = mockTestCases.find(t => t.id === selectedTestId);
  
  // Filter test cases
  const filteredTests = useMemo(() => {
    let result = mockTestCases;
    
    if (activeFilter !== 'all') {
      result = result.filter(t => t.status === activeFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.key.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [activeFilter, searchQuery]);
  
  // Status counts
  const statusCounts = useMemo(() => ({
    all: mockTestCases.length,
    not_run: mockTestCases.filter(t => t.status === 'not_run').length,
    passed: mockTestCases.filter(t => t.status === 'passed').length,
    failed: mockTestCases.filter(t => t.status === 'failed').length,
    blocked: mockTestCases.filter(t => t.status === 'blocked').length,
  }), []);
  
  // Timer format
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Current step
  const currentStep = steps[currentStepIndex];
  
  // Handle step status
  const handleStepStatus = useCallback((status: 'passed' | 'failed' | 'blocked') => {
    setSteps(prev => prev.map((s, i) => 
      i === currentStepIndex ? { ...s, status } : s
    ));
    
    // Auto-advance after delay
    setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    }, 400);
  }, [currentStepIndex, steps.length]);
  
  // Skip step
  const handleSkip = useCallback(() => {
    setSteps(prev => prev.map((s, i) => 
      i === currentStepIndex ? { ...s, status: 'skipped' } : s
    ));
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, steps.length]);
  
  // Navigation
  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const handleNextStep = () => {
    if (currentStep?.status !== 'not_run' && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  // Progress ring for cycle selector
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = selectedCycle 
    ? circumference - (selectedCycle.progress / 100) * circumference 
    : circumference;
  
  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };
  
  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <Check className="h-3 w-3 text-white" />;
      case 'failed': return <X className="h-3 w-3 text-white" />;
      case 'blocked': return <AlertTriangle className="h-3 w-3 text-white" />;
      default: return null;
    }
  };
  
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-teal-500';
      case 'failed': return 'bg-red-500';
      case 'blocked': return 'bg-purple-500';
      default: return 'bg-gray-200 border-2 border-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Page Header */}
      <header className="flex-shrink-0 border-b bg-background">
        {/* Title Row */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Test Execution</h1>
            <Badge variant="secondary" className="bg-muted text-muted-foreground font-semibold">
              {statusCounts.all - statusCounts.not_run}/{statusCounts.all} completed
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
            <Button size="sm" className="bg-primary">
              <Play className="h-4 w-4 mr-1.5" />
              Start Execution
            </Button>
          </div>
        </div>
        
        {/* Controls Row */}
        <div className="flex items-center gap-4 px-6 pb-4">
          {/* Cycle Selector */}
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[280px] bg-muted/50 border">
              <div className="flex items-center gap-2.5">
                {/* Progress Ring */}
                <div className="relative w-8 h-8">
                  <svg className="w-8 h-8 -rotate-90">
                    <circle cx="16" cy="16" r={radius} fill="none" strokeWidth="2.5" className="stroke-muted-foreground/20" />
                    <circle
                      cx="16" cy="16" r={radius}
                      fill="none" strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="stroke-teal-500 transition-all duration-500"
                    />
                  </svg>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-primary">{selectedCycle?.key}</span>
                  <span className="text-[11px] text-muted-foreground">{selectedCycle?.name}</span>
                </div>
              </div>
            </SelectTrigger>
            <SelectContent>
              {mockCycles.map(cycle => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{cycle.key}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>{cycle.name}</span>
                    <Badge variant="secondary" className="ml-2">{cycle.progress}%</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Filter Chips */}
          <div className="flex items-center gap-2">
            {(['all', 'not_run', 'passed', 'failed', 'blocked'] as FilterType[]).map((filter) => {
              const labels: Record<FilterType, string> = {
                all: 'All',
                not_run: 'Not Run',
                passed: 'Passed',
                failed: 'Failed',
                blocked: 'Blocked',
              };
              const count = statusCounts[filter];
              const isActive = activeFilter === filter;
              
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-all',
                    isActive
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {labels[filter]}
                  <span className={cn(
                    'px-1.5 py-0.5 text-xs rounded-full',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] pl-9"
            />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Test Queue Panel - Left */}
        <div className="w-[360px] flex-shrink-0 border-r bg-background flex flex-col">
          {/* Queue Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <span className="text-sm font-semibold">Test Queue</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${selectedCycle?.progress || 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedCycle?.completed}/{selectedCycle?.total}
              </span>
            </div>
          </div>
          
          {/* Queue List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredTests.map((test) => {
                const isActive = test.id === selectedTestId;
                const isExecuted = ['passed', 'failed', 'blocked'].includes(test.status);
                
                return (
                  <div
                    key={test.id}
                    onClick={() => setSelectedTestId(test.id)}
                    className={cn(
                      'flex items-start gap-3 p-3 mb-1 rounded-xl cursor-pointer transition-all border-l-[3px]',
                      isActive
                        ? 'bg-primary/5 border-l-primary'
                        : 'border-l-transparent hover:bg-muted/50',
                      isExecuted && !isActive && 'opacity-60'
                    )}
                  >
                    {/* Status Icon */}
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      getStatusBg(test.status)
                    )}>
                      {getStatusIcon(test.status)}
                    </div>
                    
                    {/* Test Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary font-mono">{test.key}</span>
                        <span className={cn('w-1.5 h-1.5 rounded-full', getPriorityColor(test.priority))} />
                      </div>
                      <p className="text-sm text-foreground truncate mt-0.5">{test.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{test.module}</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">{test.steps} steps</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredTests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-sm">No tests found</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Execution Panel - Right */}
        <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
          {selectedTest ? (
            <>
              {/* Execution Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-background border-b">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary font-mono">{selectedTest.key}</span>
                      <Badge className={cn(
                        'text-[10px] font-semibold',
                        selectedTest.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        selectedTest.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      )}>
                        {selectedTest.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mt-0.5">{selectedTest.title}</h2>
                  </div>
                </div>
                
                {/* Timer */}
                <div className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-xl border transition-all',
                  isTimerRunning ? 'bg-primary/5 border-primary/20' : 'bg-muted border-border'
                )}>
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    isTimerRunning ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Clock className={cn('h-5 w-5', isTimerRunning ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <span className={cn(
                    'text-2xl font-bold font-mono tracking-wider',
                    isTimerRunning ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {formatTime(elapsedSeconds)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                    >
                      {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setElapsedSeconds(0)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Steps Execution */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* Step Progress Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Test Steps
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all"
                          style={{ width: `${(steps.filter(s => s.status !== 'not_run').length / steps.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {steps.filter(s => s.status !== 'not_run').length} / {steps.length}
                      </span>
                    </div>
                  </div>
                  
                  {/* Step Cards */}
                  <div className="space-y-3">
                    {steps.map((step, index) => {
                      const isActive = index === currentStepIndex;
                      const isPast = index < currentStepIndex;
                      
                      return (
                        <motion.div
                          key={step.id}
                          initial={isActive ? { opacity: 0, y: 10 } : false}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'bg-background border rounded-xl overflow-hidden transition-all',
                            isActive && 'ring-2 ring-primary shadow-lg',
                            isPast && step.status !== 'not_run' && 'opacity-60'
                          )}
                        >
                          <div 
                            className={cn(
                              'flex items-start gap-4 p-4 cursor-pointer',
                              isActive && 'bg-primary/5'
                            )}
                            onClick={() => setCurrentStepIndex(index)}
                          >
                            {/* Step Number */}
                            <div className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                              step.status === 'passed' && 'bg-teal-500 text-white',
                              step.status === 'failed' && 'bg-red-500 text-white',
                              step.status === 'blocked' && 'bg-purple-500 text-white',
                              step.status === 'skipped' && 'bg-gray-400 text-white',
                              step.status === 'not_run' && isActive && 'bg-primary text-primary-foreground',
                              step.status === 'not_run' && !isActive && 'bg-muted text-muted-foreground',
                            )}>
                              {step.status === 'passed' ? <Check className="h-4 w-4" /> :
                               step.status === 'failed' ? <X className="h-4 w-4" /> :
                               step.status === 'blocked' ? <AlertTriangle className="h-4 w-4" /> :
                               step.id}
                            </div>
                            
                            {/* Step Content */}
                            <div className="flex-1 min-w-0">
                              {/* Action */}
                              <div className="mb-3">
                                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Action</span>
                                <p className="text-sm text-foreground mt-1">{step.action}</p>
                              </div>
                              
                              {/* Expected Result */}
                              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg">
                                <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Expected Result</span>
                                <p className="text-sm text-foreground mt-1">{step.expected}</p>
                              </div>
                              
                              {/* Action Buttons (only for active step) */}
                              {isActive && step.status === 'not_run' && (
                                <div className="flex items-center gap-3 mt-4">
                                  {/* Attachment Buttons */}
                                  <div className="flex gap-1">
                                    <Button variant="outline" size="sm" className="h-8 px-2">
                                      <Camera className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 px-2">
                                      <Paperclip className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 px-2">
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  <div className="flex-1" />
                                  
                                  {/* Status Buttons */}
                                  <Button
                                    onClick={() => handleStepStatus('passed')}
                                    className="bg-teal-100 hover:bg-teal-500 text-teal-700 hover:text-white border-2 border-teal-500 font-semibold"
                                  >
                                    <Check className="h-4 w-4 mr-1.5" />
                                    Pass
                                  </Button>
                                  <Button
                                    onClick={() => handleStepStatus('failed')}
                                    className="bg-red-100 hover:bg-red-500 text-red-700 hover:text-white border-2 border-red-500 font-semibold"
                                  >
                                    <X className="h-4 w-4 mr-1.5" />
                                    Fail
                                  </Button>
                                  <Button
                                    onClick={() => handleStepStatus('blocked')}
                                    className="bg-purple-100 hover:bg-purple-500 text-purple-700 hover:text-white border-2 border-purple-500 font-semibold"
                                  >
                                    <Ban className="h-4 w-4 mr-1.5" />
                                    Blocked
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
              
              {/* Execution Footer */}
              <div className="flex items-center justify-between px-6 py-3 bg-background border-t">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  
                  {/* Keyboard Shortcuts */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-muted border rounded text-[10px] font-mono">P</kbd>
                      Pass
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-muted border rounded text-[10px] font-mono">F</kbd>
                      Fail
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-muted border rounded text-[10px] font-mono">Space</kbd>
                      Timer
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSkip}>
                    <SkipForward className="h-4 w-4 mr-1.5" />
                    Skip
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrevStep}
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleNextStep}
                    disabled={currentStep?.status === 'not_run' || currentStepIndex === steps.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Select a test to execute</h3>
                <p className="text-sm text-muted-foreground">Choose a test case from the queue to begin execution</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
