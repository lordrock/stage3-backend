# Insighta Labs+ Stage 4B Solution

## Overview

Stage 4B focuses on improving the existing Insighta Labs+ system without breaking Stage 3 functionality. The goal was not to redesign the whole platform, but to optimize the current system so it can handle more users, repeated queries, and large CSV uploads.

The work focused on three areas:

1. Query performance and database efficiency
2. Query normalization and cache efficiency
3. Large-scale CSV data ingestion

---

## 1. Query Performance Optimization

### Problem

The original system queried the database every time a user requested profile data. This worked at a small scale, but it becomes inefficient when many users repeat similar filters such as:

- `gender=male&country_id=NG`
- `age_group=adult`
- `young males from nigeria`

Since the database is remote, every query also includes network latency.

### Optimization Approach

I improved query performance using:

- database indexes
- in-memory caching
- `.lean()` queries for faster reads
- cache invalidation after write operations

### Database Indexing

Indexes were added to frequently queried fields:

- gender
- age_group
- country_id
- age
- created_at

This helps MongoDB find matching records faster instead of scanning the whole collection.

### Caching

I added a lightweight in-memory cache for repeated list and search queries.

The first request goes to the database and returns:

```json
{
  "cache": "miss"
}