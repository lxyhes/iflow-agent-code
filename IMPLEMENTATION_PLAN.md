# Implementation Plan

## Stage 1: Security Hardening & Architecture Refactoring (Current)
**Goal**: Secure FastAPI backend and modularize the monolithic server.
**Success Criteria**: 
- File API endpoints require valid JWT token.
- Backend entry point is refactored to `backend/app/main.py`.
- Legacy endpoints continue to work.
**Tests**: 
- Curl request without token -> 401 (Verified)
- Curl request with invalid token -> 401 (Verified)
- Curl request to legacy endpoint -> 200 (Verified)
**Status**: Complete

## Stage 2: CI/CD Pipeline
**Goal**: Add GitHub Actions for automated testing and linting.
**Success Criteria**: 
- PRs trigger tests.
- Backend tests pass in CI.
**Status**: Not Started

## Stage 3: Full Backend Modularization
**Goal**: Split remaining `server.py` routers (Git, Analysis, RAG).
**Success Criteria**: `server.py` is empty or removed.
**Status**: Not Started
