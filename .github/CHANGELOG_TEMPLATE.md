# Changelog Entry Template

When adding a new feature or making changes, update the CHANGELOG.md file's "Unreleased" section.

## Guidelines

### Write for users
Focus on what changed from the user's perspective, not implementation details.

**Good examples:**
- Added ability to export data as CSV
- Fixed login timeout after 5 minutes of inactivity
- Changed password requirements to minimum 12 characters

**Bad examples:**
- Refactored authentication module
- Updated dependencies
- Fixed bug in line 234

### Choose the right category

- **Added** - New features users can see or use
- **Changed** - Changes to existing functionality
- **Deprecated** - Features that will be removed in future versions
- **Removed** - Features that have been removed
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

### Format

```markdown
### Added
- Brief description of the feature ([#123](link-to-pr))
```

### Link references
Always include PR or issue numbers so readers can find more context.

### Breaking changes
If a change breaks backward compatibility, mark it clearly:

```markdown
### Changed
- **BREAKING**: Authentication now requires API keys instead of basic auth ([#456](link))
```

## Example entry

```markdown
## [Unreleased]

### Added
- User registration endpoint with email verification ([#45](link))
- Rate limiting for API requests (100 requests per minute) ([#47](link))

### Changed
- **BREAKING**: Updated response format for error messages to include error codes ([#48](link))

### Fixed
- Resolved timeout issue when uploading files larger than 10MB ([#49](link))
```

