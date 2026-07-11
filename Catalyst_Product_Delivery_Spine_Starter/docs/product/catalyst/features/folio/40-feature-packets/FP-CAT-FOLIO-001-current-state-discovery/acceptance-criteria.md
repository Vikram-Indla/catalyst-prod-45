# Acceptance criteria

The discovery packet passes only when:

- [ ] Every claimed capability cites a real repository path, runtime screen, schema object, test, or captured artifact.
- [ ] Current, partial, mocked, dead, and missing capabilities are separated.
- [ ] Folio's actual user roles and permissions are mapped.
- [ ] The persistence model and content lifecycle are mapped.
- [ ] At least one end-to-end current user journey is executed in the runtime.
- [ ] UI screenshots cover primary, empty, loading, error, and permission-denied states where available.
- [ ] Existing tests are inventoried and relevant probes are run.
- [ ] All mandatory blind spots from the exploration file are assessed.
- [ ] Notion comparisons are classified rather than copied.
- [ ] Mobbin/Figma recommendations are evidence-based and optional, not automatic.
- [ ] No production code, schema, or configuration is changed.
- [ ] Candidate changes are fragmented into small, independently testable future packets.
- [ ] Unverified facts are explicitly marked `cannot confirm`.
