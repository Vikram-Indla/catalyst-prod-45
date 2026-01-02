# Catalyst In-Jira Implementation Handbook

**Version:** 1.0.0  
**Classification:** Engineering Documentation  
**Last Updated:** 2026-01-02  
**Status:** Build-Ready

---

## Table of Contents

### Part I: Foundation

1. [Executive Summary](./01-EXECUTIVE-SUMMARY.md)
2. [Architecture Overview](./02-ARCHITECTURE.md)
3. [Technology Stack](./03-TECHNOLOGY-STACK.md)

### Part II: Data Layer

4. [Database Schema](./04-DATABASE-SCHEMA.md)
5. [Data Models & Types](./05-DATA-MODELS.md)
6. [Row Level Security](./06-ROW-LEVEL-SECURITY.md)

### Part III: API Layer

7. [API Reference](./07-API-REFERENCE.md)
8. [Edge Functions](./08-EDGE-FUNCTIONS.md)
9. [Real-time Subscriptions](./09-REALTIME.md)

### Part IV: Domain Logic

10. [Issue Management](./10-ISSUE-MANAGEMENT.md)
11. [Workflow Engine](./11-WORKFLOW-ENGINE.md)
12. [JQL Grammar & Parser](./12-JQL-GRAMMAR.md)
13. [Board System](./13-BOARD-SYSTEM.md)
14. [Sprint & Release Management](./14-SPRINT-RELEASE.md)

### Part V: Security & Compliance

15. [Permission System](./15-PERMISSIONS.md)
16. [Audit Logging](./16-AUDIT-LOGGING.md)
17. [Security Controls](./17-SECURITY-CONTROLS.md)

### Part VI: Integration

18. [Jira Cloud Import](./18-JIRA-IMPORT.md)
19. [AI Agents](./19-AI-AGENTS.md)
20. [External Integrations](./20-EXTERNAL-INTEGRATIONS.md)

### Part VII: Quality Assurance

21. [Testing Strategy](./21-TESTING-STRATEGY.md)
22. [Parity Test Suite](./22-PARITY-TESTS.md)
23. [Performance Benchmarks](./23-PERFORMANCE.md)

### Part VIII: Operations

24. [Deployment Guide](./24-DEPLOYMENT.md)
25. [Monitoring & Observability](./25-MONITORING.md)
26. [Disaster Recovery](./26-DISASTER-RECOVERY.md)
27. [Runbooks](./27-RUNBOOKS.md)

### Appendices

- [Appendix A: Lovable AI Execution Prompts](./APPENDIX-A-PROMPTS.md)
- [Appendix B: Parity Conformance Matrix](./APPENDIX-B-PARITY-MATRIX.md)
- [Appendix C: Glossary](./APPENDIX-C-GLOSSARY.md)
- [Appendix D: Change Log](./APPENDIX-D-CHANGELOG.md)

---

## Document Conventions

### Terminology

| Term | Definition |
|------|------------|
| MUST | Absolute requirement |
| MUST NOT | Absolute prohibition |
| SHOULD | Recommended but not mandatory |
| MAY | Optional feature |

### Code Blocks

```sql
-- SQL code blocks use this format
SELECT * FROM table;
```

```typescript
// TypeScript code blocks use this format
const x: string = "value";
```

### Status Indicators

- ✅ Implemented
- 🚧 In Progress
- 📋 Planned
- ❌ Not Planned

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-02 | GenSpark AI | Initial release |
