# Memory Bank Usage Guide

## What is the Memory Bank?

The Memory Bank is a structured knowledge repository for the TextMate Frontend project. It serves as a living documentation system that captures project context, technical decisions, progress, and architectural patterns. Think of it as the project's institutional memory that helps maintain continuity and accelerates onboarding.

## Memory Bank Structure

The Memory Bank consists of six core files, each serving a specific purpose:

### 1. `activeContext.md` - Current State & Immediate Context
**Purpose**: Captures the current state of the project, recent changes, and immediate development focus.

**When to use**:
- Starting a new development session
- Understanding what's currently being worked on
- Getting up to speed after time away from the project
- Onboarding new team members

**Key sections**:
- Current work focus and recent changes
- Active development patterns and technical decisions
- Development environment setup
- Current challenges and considerations
- Code quality standards and testing strategy

### 2. `productContext.md` - Why & What
**Purpose**: Explains the project's purpose, problems it solves, and user experience goals.

**When to use**:
- Understanding the product vision and user needs
- Making feature decisions aligned with product goals
- Explaining the project to stakeholders
- Evaluating new feature proposals

**Key sections**:
- Problems the project solves
- How the product should work
- User experience goals and success metrics
- Competitive landscape and differentiation

### 3. `progress.md` - What's Done & What's Next
**Purpose**: Tracks completed work, current status, and future roadmap.

**When to use**:
- Planning development sprints or releases
- Understanding project maturity and readiness
- Identifying technical debt and improvement opportunities
- Setting priorities and timelines

**Key sections**:
- What works (completed functionality)
- What's left to build (roadmap)
- Current development status and known issues
- Quality metrics and success indicators

### 4. `projectbrief.md` - High-Level Overview
**Purpose**: Concise project summary for quick understanding.

**When to use**:
- Quick project orientation
- High-level stakeholder communication
- Project documentation and README references
- New team member onboarding

**Key sections**:
- Project overview and core requirements
- Technical scope and target users
- Success criteria and constraints

### 5. `systemPatterns.md` - Architectural Patterns
**Purpose**: Documents the technical architecture and design patterns used.

**When to use**:
- Understanding how to implement new features correctly
- Onboarding developers to the codebase architecture
- Making architectural decisions
- Troubleshooting technical issues

**Key sections**:
- Core architectural patterns (dependency injection, event system)
- Component architecture patterns
- Service layer patterns
- Error handling and performance patterns

### 6. `techContext.md` - Technical Stack & Tools
**Purpose**: Details the technology stack, development setup, and technical infrastructure.

**When to use**:
- Setting up development environment
- Understanding technical constraints and capabilities
- Planning technology upgrades or migrations
- Troubleshooting development issues

**Key sections**:
- Technology stack and versions
- Development setup and commands
- Architecture patterns and API integration
- Testing strategy and deployment considerations

## How to Use the Memory Bank

### For New Team Members

1. **Start with `projectbrief.md`** - Get the high-level overview
2. **Read `productContext.md`** - Understand the why behind the project
3. **Review `activeContext.md`** - Understand current state and focus
4. **Study `systemPatterns.md`** - Learn the architecture and patterns
5. **Check `techContext.md`** - Set up your development environment
6. **Review `progress.md`** - Understand what's done and what's next

### For Starting Development Work

1. **Always check `activeContext.md`** first to understand current focus
2. **Review recent changes** to understand what's been modified
3. **Check `progress.md`** for current status and known issues
4. **Reference `systemPatterns.md`** for implementation guidance
5. **Update `activeContext.md`** when starting significant new work

### For Making Architectural Decisions

1. **Review `systemPatterns.md`** for existing patterns
2. **Check `techContext.md`** for technical constraints
3. **Consider `productContext.md`** for user impact
4. **Document decisions** in the appropriate memory bank file

### For Planning and Prioritization

1. **Review `progress.md`** for current roadmap and status
2. **Check `activeContext.md`** for current focus areas
3. **Reference `productContext.md`** for alignment with goals
4. **Update plans** in `progress.md` as decisions are made

## Maintenance Guidelines

### When to Update

- **`activeContext.md`**: Update when starting new features, completing significant work, or changing focus
- **`progress.md`**: Update when completing features, changing roadmap, or assessing quality metrics
- `productContext.md`: Update when product goals or user needs change
- `projectbrief.md`: Update when project scope or requirements significantly change
- `systemPatterns.md`: Update when introducing new architectural patterns or significant refactoring
- `techContext.md`: Update when technology stack changes or development setup evolves

### How to Update

1. **Be specific and concrete** - Include actual commit hashes, file names, and technical details
2. **Keep it current** - Update regularly to maintain accuracy
3. **Maintain structure** - Follow existing section organization
4. **Cross-reference** - Link between related sections in different files
5. **Version control** - All changes are tracked in git, maintain clean commit history

### Best Practices

- **Update before starting work** to document intentions
- **Update after completing work** to record outcomes
- **Include dates and context** for future reference
- **Be honest about challenges** and technical debt
- **Keep sections focused** on their specific purpose
- **Use consistent formatting** for readability

## Integration with Development Workflow

### Git Integration

The Memory Bank files are part of the git repository and should be updated alongside code changes:

```bash
# Example workflow
git checkout -b feature/new-functionality
# Update memory-bank/activeContext.md with new work focus
# Implement the feature
# Update memory-bank/progress.md with completed work
git add memory-bank/
git commit -m "feat: implement new functionality and update memory bank"
```

### Development Commands

Memory Bank updates should be part of your regular development workflow:

```bash
# Before starting work
echo "Starting work on [feature]" >> memory-bank/activeContext.md

# During development
# Reference patterns and context as needed

# After completion
echo "Completed [feature]" >> memory-bank/progress.md
```

### Code Review Integration

Memory Bank updates should be reviewed alongside code changes:

- **Check for accuracy** - Are technical details correct?
- **Verify completeness** - Are all relevant aspects documented?
- **Ensure consistency** - Do updates align with existing documentation?
- **Assess clarity** - Is the information clear and useful?

## Benefits of Using the Memory Bank

### For Individual Developers

- **Faster onboarding** to new areas of the codebase
- **Better decision making** with full context
- **Reduced cognitive load** with documented patterns
- **Improved productivity** with clear guidance

### For Teams

- **Consistent understanding** across team members
- **Reduced knowledge silos** and single points of failure
- **Better collaboration** with shared context
- **Faster onboarding** of new team members

### For the Project

- **Institutional memory** that persists across team changes
- **Architectural consistency** over time
- **Better quality** with documented standards and patterns
- **Easier maintenance** with clear documentation

## Troubleshooting

### Common Issues

**Memory Bank is outdated**:
- Regular updates are responsibility of the entire team
- Make updates part of your definition of done
- Review and update during planning sessions

**Information is hard to find**:
- Use the section structure to locate relevant information
- Check multiple files - some topics span multiple documents
- Use git history to track down when information was added

**Conflicting information**:
- Newer information generally takes precedence
- Check git history for context around changes
- Discuss with the team to resolve discrepancies

**Getting started feels overwhelming**:
- Start with `projectbrief.md` for a quick overview
- Focus on the files most relevant to your current task
- Ask team members for guidance on key sections

## Examples

### Example 1: Starting a New Feature

```markdown
# Update to activeContext.md

## Recent Changes & Activity
### Current Work Focus
- **New Feature**: Implementing text analytics dashboard
- **Files Modified**: Starting work on analytics components
- **Technical Approach**: Following existing service layer patterns
```

### Example 2: Completing Work

```markdown
# Update to progress.md

## What Works
### New Functionality ✅
- **Text Analytics Dashboard**: Real-time text statistics and readability scores
- **Performance Metrics**: Flesch-Kincaid reading level calculations
- **Visual Analytics**: Charts and graphs for text analysis
```

### Example 3: Documenting a Pattern

```markdown
# Update to systemPatterns.md

### 4. Analytics Service Pattern
**Purpose**: Centralize text analytics calculations
**Implementation**: Service-based architecture with caching

```typescript
class TextAnalyticsService {
  calculateReadabilityScore(text: string): ReadabilityScore {
    // Implementation following existing service patterns
  }
}
```
```

## Conclusion

The Memory Bank is a living documentation system that evolves with your project. Its effectiveness depends on regular updates and consistent use by the entire team. When used properly, it becomes an invaluable resource for maintaining project continuity, accelerating development, and ensuring architectural consistency.

Remember: **The Memory Bank is only as useful as you make it.** Regular updates and thoughtful documentation ensure it remains a valuable asset for the entire team.
