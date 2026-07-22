# Tide Fold

A mobile visual toy built directly on matsuoka-601's WebGPU Ocean. Drag horizontally to fold the invisible simulation bounds around 70,000 MLS-MPM particles; release to let the same water mass surge and settle.

- Product mode: `/`
- Source-faithful baseline: `/?baseline=1`
- Deterministic error QA: `/?qa-error=1`
- Build: `npm ci && npm run build`

The upstream implementation is fixed at commit `3bd932778650b5e756ba2590969ed618313843ad` and used under MIT. See `THIRD_PARTY_NOTICES.md` and `LICENSE`.
