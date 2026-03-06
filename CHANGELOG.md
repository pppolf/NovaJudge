# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-06

### Added
- **Core Contest System**: Support for creating and managing programming contests with real-time scoreboards.
- **Judge Engine Integration**: Integrated with Go-Judge for secure and efficient code execution (C, C++, Java, Python).
- **Admin Dashboard**: Comprehensive admin interface for managing contests, problems, users, and submissions.
- **CCS API**: Implemented ICPC Contest Control System (CCS) compliant API endpoints for external tools (e.g., scoreboard resolvers).
- **Real-time Updates**: Live updates for contest events, submissions, and scoreboard changes using Redis.
- **Problem Management**: Support for special judge (SPJ), interactive problems, and test case management.
- **User Roles**: Distinct roles for Teams, Admins, Judges, and Observers.
- **Export/Import**: Functionality to export and import contest data and problem sets.
- **Balloon Tracking**: System for tracking and managing balloon delivery for solved problems.
- **Clarification System**: Q&A system for contestants to ask clarifications during contests.
- **Contest Visibility**: Added ability for admins to toggle contest visibility on the homepage.

### Changed
- **Judge Logic**: Java submissions now have 2x time and memory limits automatically applied.
- **UI/UX**: Improved pagination logic in admin panels to support deep linking and browser history.
- **Database Schema**: Optimized Prisma schema for better performance and data integrity.

### Fixed
- Fixed pagination issues in the admin problem list where data wouldn't refresh on page change.
- Fixed incremental progress bar updates for live contest feeds.
- Resolved various UI glitches and data fetching inconsistencies.
