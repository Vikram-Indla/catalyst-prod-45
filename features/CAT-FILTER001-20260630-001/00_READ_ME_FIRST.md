# CAT-FILTER001-20260630-001 — Canonical Filter Redesign

**Feature Work ID**: CAT-FILTER001-20260630-001  
**Date**: 2026-06-30  
**Branch**: main  
**Status**: Plan Lock pending

## One-Line Summary
Redesign CanonicalFilter to be context-aware, ADS-compliant, and visually consistent with home page status pills.

## Problems Being Solved
1. Filter panel is too wide (no fixed maxWidth)
2. Status pills in filter don't match canonical home page status pills (wrong appearance)
3. Assignee options broken — 0 of 0 results
4. Parent field shown in Business Request context (BR has no parent)
5. Work type shows all 16 types regardless of context
6. Advanced tab has no value — strip it
7. "Give feedback" footer wastes space
8. "Add field" button — replace with fixed context-driven fields
9. 8 rgba hex-fallback violations in shadow tokens
10. Labels field not yet introduced to all non-subtask work item types

## Council Verdict
Score: 14/30 — HALT. Full critique in council output (session 001).

## Context
- Consumer: all backlogs (Business Request, Product, Project, TestHub, Kanban, Timeline)
- ADS authority: https://atlassian.design/
- Canonical status source: StatusLozenge + statusPalette.ts
- Hierarchy source: HierarchyConfigContext.tsx
