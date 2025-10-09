# Project TODO

A living checklist for development work. Keep items concise and action-oriented.

## Conventions
- Write tasks as verbs with clear outcomes (<= 14 words)
- Prefer fewer, higher-level items; split only when it improves clarity
- Update statuses when you start/finish work
- Link PRs or relevant files inline for context

## Completed ✅
- [x] **Publications Schema Migration**: Migrated from MediaEntity to comprehensive Publications schema
- [x] **Migration Scripts Cleanup**: Removed obsolete migration scripts and documentation
- [x] **File Organization**: Reorganized JSON files into proper directory structure
- [x] **API Integration**: Full CRUD operations for Publications
- [x] **Admin Interface**: Complete publications management interface

## In Progress 🔄
- [ ] Establish a publication ID system and ensure it's shared across components
- [ ] Add streaming distribution channels - include podcasts, video, etc
- [ ] Add logo and supporting image files for publications

## Backlog 📋
- [ ] Separate user roles and ownership: brand user, publication user (can belong to many publications), and admin user
- [ ] Move storefront configuration into the dashboard
- [ ] Migrate all surveys into the database and make available for dashboard
- [ ] Add collected files into the knowledge base
- [ ] Review `src/pages/*` for route-level error boundaries
- [ ] Add basic tests for `src/integrations/mongodb/services.ts`
- [ ] Implement publication analytics and reporting
- [ ] Add bulk import/export functionality for publications
- [ ] Create publication verification workflow
- [ ] Add real-time collaboration features for admin users

