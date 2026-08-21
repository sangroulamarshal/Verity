# server/engines

Pure domain logic: normalization, risk & anomaly detection, cash-flow
forecasting. No framework imports, no direct database access, no HTTP.
Functions here take plain data in (canonical `Transaction[]`, not raw
CSV/XLSX rows) and return plain data out — this is what makes them testable
with Vitest alone, and what keeps the "source format shouldn't matter after
normalization" requirement real.

Populated starting Phase 4 (normalization engine).
