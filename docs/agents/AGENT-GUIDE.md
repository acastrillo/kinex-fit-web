# Agent Guide

This guide describes all available specialized agents, when to use them, and how they collaborate.

## Quick Reference

| Agent | Primary Use | Key Expertise |
|-------|-------------|---------------|
| [nextjs-developer](#nextjs-developer) | Next.js applications | App Router, Server Components, Performance, SEO |
| [react-specialist](#react-specialist) | React patterns & optimization | Hooks, Performance, State Management, Modern React 18+ |
| [typescript-pro](#typescript-pro) | TypeScript development | Type Safety, Generics, Advanced Types, Build Config |
| [business-analyst](#business-analyst) | Business logic & requirements | User Stories, Feature Planning, Requirements Analysis |
| [ui-designer](#ui-designer) | UI/UX design | Component Design, Design Systems, Accessibility |
| [ux-researcher](#ux-researcher) | User experience research | User Testing, Usability, User Flows |
| [security-reviewer](#security-reviewer) | Security audit & compliance | Security Best Practices, Vulnerability Assessment |
| [fitness-branding-strategist](#fitness-branding-strategist) | Brand & marketing | Brand Voice, Marketing Strategy, Positioning |

---

## When to Use Each Agent

### Development Agents

#### nextjs-developer
**Use when:**
- Building or modifying Next.js pages and layouts
- Implementing Server Components or Server Actions
- Optimizing Core Web Vitals (LCP, CLS, FID, TTFB)
- Setting up API routes or middleware
- Configuring deployment or caching strategies
- Working with Next.js 14+ App Router features
- Implementing SEO improvements (metadata, sitemaps, structured data)

**Expertise:**
- Next.js 14+ App Router architecture
- Server Components and streaming SSR
- Server Actions with form handling
- Performance optimization (image, font, script loading)
- SEO implementation (Metadata API, Open Graph)
- Deployment strategies (Vercel, self-hosting, Docker, edge)
- Full-stack features (database, auth, file uploads)

**Collaborates with:**
- react-specialist (React patterns)
- typescript-pro (type safety)
- security-reviewer (security implementation)

**Example tasks:**
- "Add a new workout detail page using Server Components"
- "Optimize the homepage for Core Web Vitals"
- "Implement streaming for the workout library"
- "Set up ISR for the calendar page"

---

#### react-specialist
**Use when:**
- Implementing complex React component logic
- Optimizing component performance (memo, useMemo, useCallback)
- Working with React 18+ concurrent features
- Setting up context providers or custom hooks
- Debugging rendering issues or performance bottlenecks
- Implementing advanced patterns (compound components, render props)

**Expertise:**
- Modern React 18+ features (Suspense, Transitions, Server Components)
- Performance optimization techniques
- Custom hooks and composition patterns
- State management (Context, Zustand, Redux)
- React patterns (HOCs, render props, compound components)
- Testing React components

**Collaborates with:**
- nextjs-developer (Next.js integration)
- typescript-pro (React TypeScript patterns)
- ui-designer (component architecture)

**Example tasks:**
- "Optimize the workout card carousel for smooth performance"
- "Create a custom hook for managing workout state"
- "Fix excessive re-renders in the exercise list component"
- "Implement Suspense boundaries for async components"

---

#### typescript-pro
**Use when:**
- Fixing TypeScript errors or type mismatches
- Implementing complex type definitions
- Setting up strict mode or improving type safety
- Creating utility types or generic functions
- Configuring tsconfig.json
- Migrating JavaScript code to TypeScript

**Expertise:**
- Advanced TypeScript patterns (generics, conditional types, mapped types)
- Type-safe API design
- TypeScript build configuration
- Discriminated unions and type guards
- Strict mode best practices
- Monorepo type management

**Collaborates with:**
- nextjs-developer (Next.js TypeScript setup)
- react-specialist (React TypeScript patterns)

**Example tasks:**
- "Fix the type errors in the workout API responses"
- "Create a type-safe wrapper for the DynamoDB client"
- "Add strict null checks to the authentication module"
- "Optimize TypeScript build performance"

---

### Design & UX Agents

#### ui-designer
**Use when:**
- Designing new UI components
- Creating or improving design systems
- Implementing accessibility features
- Choosing color palettes, typography, or spacing
- Improving visual consistency
- Creating responsive layouts

**Expertise:**
- Component design patterns
- Design systems and style guides
- Accessibility (WCAG, ARIA)
- Responsive design
- Color theory and typography
- shadcn/ui and Tailwind CSS

**Collaborates with:**
- ux-researcher (user needs)
- react-specialist (component implementation)
- fitness-branding-strategist (brand alignment)

**Example tasks:**
- "Design a better workout card layout"
- "Improve the settings page accessibility"
- "Create a consistent button style system"
- "Design mobile-friendly navigation"

---

#### ux-researcher
**Use when:**
- Planning user flows or journey maps
- Identifying usability issues
- Conducting user testing analysis
- Improving user onboarding
- Analyzing user behavior patterns
- Validating feature ideas with user needs

**Expertise:**
- User research methodologies
- Usability testing
- User flow analysis
- Journey mapping
- Heuristic evaluation
- Conversion optimization

**Collaborates with:**
- ui-designer (design implementation)
- business-analyst (requirements)

**Example tasks:**
- "Analyze the workout creation flow for friction points"
- "Design an onboarding experience for new users"
- "Identify why users aren't completing workouts"
- "Optimize the subscription conversion funnel"

---

### Business & Strategy Agents

#### business-analyst
**Use when:**
- Defining feature requirements
- Writing user stories or acceptance criteria
- Analyzing business logic requirements
- Planning feature scope
- Evaluating business impact of changes
- Prioritizing features

**Expertise:**
- Requirements gathering
- User story writing
- Business logic analysis
- Feature planning and scope definition
- Stakeholder communication
- ROI analysis

**Collaborates with:**
- ux-researcher (user needs)
- fitness-branding-strategist (business strategy)

**Example tasks:**
- "Write user stories for the AI workout generator"
- "Define acceptance criteria for subscription management"
- "Analyze the business impact of adding social features"
- "Prioritize Phase 6 AI features by value"

---

#### fitness-branding-strategist
**Use when:**
- Defining brand voice and messaging
- Creating marketing copy or content
- Planning go-to-market strategies
- Positioning against competitors
- Naming features or products
- Aligning design with brand identity

**Expertise:**
- Fitness industry knowledge
- Brand positioning and messaging
- Marketing strategy
- Content creation
- Competitive analysis
- Brand voice and tone

**Collaborates with:**
- business-analyst (business requirements)
- ui-designer (visual brand alignment)

**Example tasks:**
- "Create messaging for the Elite subscription tier"
- "Position Kinex Fit against competitor apps"
- "Write marketing copy for the AI workout generator"
- "Define the brand voice for in-app messaging"

---

### Security & Compliance Agents

#### security-reviewer
**Use when:**
- Auditing code for security vulnerabilities
- Implementing authentication or authorization
- Reviewing API security
- Setting up security headers or CSP
- Handling sensitive data (passwords, tokens, PII)
- Preparing for security compliance (SOC2, HIPAA, etc.)

**Expertise:**
- OWASP Top 10 vulnerabilities
- Authentication and authorization patterns
- API security best practices
- Data encryption and storage
- Security headers and CSP
- Compliance requirements

**Collaborates with:**
- nextjs-developer (security implementation)
- typescript-pro (type-safe security)

**Example tasks:**
- "Review the authentication flow for vulnerabilities"
- "Implement rate limiting on the AI API endpoints"
- "Audit the Stripe webhook handler for security issues"
- "Add CSP headers to prevent XSS attacks"

---

## Agent Collaboration Patterns

### Common Workflows

#### Feature Development
1. **business-analyst** - Define requirements and user stories
2. **ux-researcher** - Design user flows and validate approach
3. **ui-designer** - Create component designs and layouts
4. **nextjs-developer** or **react-specialist** - Implement the feature
5. **typescript-pro** - Ensure type safety
6. **security-reviewer** - Audit for vulnerabilities

#### Performance Optimization
1. **nextjs-developer** - Analyze Core Web Vitals and identify bottlenecks
2. **react-specialist** - Optimize component rendering
3. **typescript-pro** - Ensure type-safe performance patterns

#### New Feature Launch
1. **business-analyst** - Define scope and success metrics
2. **fitness-branding-strategist** - Create messaging and positioning
3. **ux-researcher** - Validate user needs
4. **ui-designer** - Design the experience
5. **Development team** - Build and test
6. **security-reviewer** - Security audit before launch

---

## How to Invoke Agents

When working with Claude Code, you can request a specialized agent by:

1. **Explicitly asking for them:**
   - "Let's use the nextjs-developer agent to optimize this page"
   - "Can the security-reviewer audit this authentication flow?"

2. **Describing the task type:**
   - Claude will automatically select appropriate agents based on context
   - E.g., "Fix these TypeScript errors" → typescript-pro
   - E.g., "Improve this component's performance" → react-specialist

3. **Complex tasks may involve multiple agents:**
   - Claude will coordinate agent handoffs automatically
   - E.g., "Build a new feature" might involve business-analyst → ui-designer → nextjs-developer → security-reviewer

---

## Agent Files

Each agent has a detailed persona file in `docs/agents/`:

- `nextjs-developer-agent.md` - Next.js development specialist
- `react-specialist-agent.md` - React patterns and optimization
- `typescript-agent.md` - TypeScript development expert
- `business-analyst.md` - Business logic and requirements
- `ui-designer.md` - UI/UX design guidance
- `ux-researcher.md` - User experience research
- `security-reviewer.md` - Security audit and compliance
- `fitness-branding-strategist.md` - Brand and marketing strategy

---

## Best Practices

1. **Single Responsibility**: Each agent focuses on their area of expertise
2. **Clear Handoffs**: Agents communicate requirements clearly when collaborating
3. **Context Sharing**: All agents have access to project documentation
4. **Quality Focus**: Each agent maintains high standards in their domain
5. **User-Centric**: All agents prioritize user needs and experience

---

## Common Questions

**Q: Can I use multiple agents at once?**
A: Yes! Complex tasks often require multiple agents working together. Claude will coordinate the collaboration.

**Q: How do I know which agent to use?**
A: Describe your task naturally. If you're not sure, Claude will select the appropriate agent(s) based on context.

**Q: Can agents work on tasks outside their specialty?**
A: Agents can provide general guidance, but they excel in their areas of expertise. For best results, use the specialist agent for specialized tasks.

**Q: What if I need help with something not covered by these agents?**
A: Claude Code can handle general tasks without specialized agents. These agents are for when you need deep expertise in specific areas.

---

*Last Updated: December 27, 2025*
