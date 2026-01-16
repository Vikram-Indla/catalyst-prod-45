/**
 * Release Dashboard Header
 * Displays release info, health gauge, and quality gates
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ChevronRight, Edit2, Download, CheckCircle2, Calendar, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ReleaseDetail, HealthScore, QualityGate } from '../types';
import { STATUS_LABELS, getHealthColor } from '../types';

interface DashboardHeaderProps {
  release: ReleaseDetail;
  healthScore: HealthScore;
  qualityGates: QualityGate[];
}

export function DashboardHeader({ release, healthScore, qualityGates }: DashboardHeaderProps) {
  const healthColor = getHealthColor(healthScore.level);
  const healthLabel = healthScore.level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-700"><Home className="w-3.5 h-3.5" /></Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/releases/all" className="hover:text-slate-700">Releases</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/releases/all" className="hover:text-slate-700">All Releases</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-medium">{release.version}</span>
      </nav>

      {/* Main Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-xl p-5"
      >
        {/* Top Row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-slate-900">{release.version}</h1>
              <Badge className="bg-[#2563eb]/10 text-[#2563eb] border-0">{STATUS_LABELS[release.status]}</Badge>
              <Badge 
                className="border-0"
                style={{ 
                  backgroundColor: `${healthColor}15`, 
                  color: healthColor 
                }}
              >
                {healthLabel}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{release.name} — {release.organization}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(release.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(release.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {release.releaseManager.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {release.daysRemaining} days remaining
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Edit2 className="w-4 h-4 mr-1" />Edit</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Export</Button>
            <Button size="sm" className="bg-[#0d9488] hover:bg-[#0d9488]/90">
              <CheckCircle2 className="w-4 h-4 mr-1" />Approve Release
            </Button>
          </div>
        </div>

        {/* Health + Gates Row */}
        <div className="flex gap-6 pt-4 border-t border-slate-100">
          {/* Health Gauge */}
          <div className="flex items-center gap-4">
            <div className="relative w-[100px] h-[100px]">
              <svg className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={healthColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore.score / 100) * 251.2} 251.2`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: healthColor }}>{healthScore.score}%</span>
                <span className="text-[10px] uppercase text-slate-500">Health</span>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              <span className={healthScore.trend.direction === 'down' ? 'text-[#ef4444]' : 'text-[#0d9488]'}>
                {healthScore.trend.direction === 'down' ? '↓' : '↑'}{healthScore.trend.value}%
              </span>
              <span className="ml-1">{healthScore.trend.period}</span>
            </div>
          </div>

          {/* Quality Gates Grid */}
          <div className="flex-1">
            <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Quality Gates</h3>
            <div className="grid grid-cols-3 gap-2">
              {qualityGates.map(gate => (
                <div
                  key={gate.id}
                  className="flex items-center gap-2 p-2 rounded-lg border"
                  style={{
                    backgroundColor: gate.status === 'pass' ? '#ccfbf1' : gate.status === 'fail' ? '#fee2e2' : '#f1f5f9',
                    borderColor: gate.status === 'pass' ? '#0d9488' : gate.status === 'fail' ? '#ef4444' : '#94a3b8',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: gate.status === 'pass' ? '#0d9488' : gate.status === 'fail' ? '#ef4444' : '#94a3b8' }}
                  >
                    {gate.status === 'pass' ? '✓' : gate.status === 'fail' ? '✗' : '?'}
                  </div>
                  <span className="text-xs font-medium text-slate-700">{gate.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
