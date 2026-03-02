import type { Skill, Framework } from "@/types";

// ============================================
// RAG Skills System
// ============================================
// Pre-built knowledge documents for each framework.
// These are injected into the AI context when relevant.

export const skills: Skill[] = [
  // ---- React ----
  {
    id: "react-hooks",
    framework: "react",
    title: "React Hooks Best Practices",
    content: `React Hooks Best Practices:
- useState: Use for simple state. Use functional updates when new state depends on previous: setState(prev => prev + 1)
- useEffect: Always include cleanup for subscriptions/timers. Use dependency array correctly.
- useMemo: Wrap expensive computations. Don't overuse for simple values.
- useCallback: Wrap functions passed as props to prevent unnecessary re-renders.
- useRef: Use for DOM references and mutable values that don't trigger re-renders.
- Custom hooks: Extract reusable logic into custom hooks (useForm, useFetch, useLocalStorage).
- Rules: Never call hooks conditionally. Always call at top level of component.
- Pattern: Use useReducer for complex state logic with multiple sub-values.`,
  },
  {
    id: "react-patterns",
    framework: "react",
    title: "React Component Patterns",
    content: `React Component Patterns:
- Composition: Prefer composition over inheritance. Use children prop and render props.
- Container/Presentational: Separate data fetching (container) from rendering (presentational).
- Compound Components: Components that work together sharing implicit state (Tabs, Accordion).
- Controlled/Uncontrolled: Controlled components have state managed by parent via props.
- Error Boundaries: Wrap sections in error boundaries for graceful error handling.
- Suspense: Use React.Suspense with lazy() for code splitting.
- Portals: Use createPortal for modals, tooltips that need to escape overflow.
- forwardRef: Use when parent needs direct access to child DOM element.`,
  },

  // ---- Next.js ----
  {
    id: "nextjs-app-router",
    framework: "nextjs",
    title: "Next.js App Router Patterns",
    content: `Next.js App Router Patterns:
- File-based routing: app/page.tsx = /, app/about/page.tsx = /about
- Layouts: layout.tsx wraps all pages in that directory. Shared UI (nav, sidebar).
- Loading states: loading.tsx shows during page transitions (uses Suspense).
- Error handling: error.tsx catches errors in that route segment.
- Server Components (default): Fetch data directly, no client JS bundle.
- Client Components: Add "use client" at top. Required for useState, useEffect, event handlers.
- Route Handlers: app/api/route.ts for API endpoints. Export GET, POST, etc.
- Metadata: Export metadata object or generateMetadata function for SEO.
- Server Actions: "use server" functions for form submissions and mutations.
- Dynamic routes: [slug]/page.tsx with params prop.`,
  },
  {
    id: "nextjs-data-fetching",
    framework: "nextjs",
    title: "Next.js Data Fetching",
    content: `Next.js Data Fetching:
- Server Components: Fetch directly in component using async/await. No useEffect needed.
- fetch() caching: Next.js extends fetch with caching. { cache: 'force-cache' } (default), { cache: 'no-store' }, { next: { revalidate: 60 } }.
- Route Handlers: Full request/response control. Good for webhooks, third-party APIs.
- Server Actions: "use server" functions. Call from client components for mutations.
- Parallel fetching: Use Promise.all() to fetch multiple resources simultaneously.
- Streaming: Return loading UI immediately while data fetches with Suspense.
- ISR (Incremental Static Regeneration): revalidatePath() or revalidateTag() to update cached pages.`,
  },

  // ---- Vue ----
  {
    id: "vue-composition",
    framework: "vue",
    title: "Vue 3 Composition API",
    content: `Vue 3 Composition API:
- <script setup>: Preferred syntax. Variables/functions auto-exposed to template.
- ref(): For primitive reactive values. Access with .value in script, direct in template.
- reactive(): For objects. No .value needed. Don't destructure (loses reactivity).
- computed(): Cached computed properties. Automatically tracks dependencies.
- watch(): Watch specific sources. watchEffect() auto-tracks dependencies.
- onMounted(), onUnmounted(): Lifecycle hooks inside setup.
- provide/inject: Dependency injection for deep component trees.
- defineProps(): Type-safe props. defineEmits(): Type-safe events.
- Composables: Extract reusable logic into use* functions (like React hooks).
- toRef/toRefs: Create refs from reactive object properties.`,
  },
  {
    id: "vue-patterns",
    framework: "vue",
    title: "Vue Component Patterns",
    content: `Vue Component Patterns:
- Single File Components: .vue files with <template>, <script setup>, <style scoped>.
- Slots: Default, named, and scoped slots for flexible content composition.
- v-model: Two-way binding. defineModel() macro in 3.4+.
- Teleport: Render content in different DOM location (modals, tooltips).
- Suspense: Async component loading with fallback.
- Keep-alive: Cache component instances when switching between views.
- Dynamic components: <component :is="currentComponent" />.
- Pinia: Recommended state management. defineStore with state, getters, actions.`,
  },

  // ---- Angular ----
  {
    id: "angular-standalone",
    framework: "angular",
    title: "Angular Standalone Components",
    content: `Angular Standalone Components:
- standalone: true in @Component decorator. No NgModule needed.
- imports: Array directly in component for dependencies.
- Signals: signal(), computed(), effect() for reactive state (Angular 16+).
- Input/Output: input() and output() functions (Angular 17+).
- Control flow: @if, @for, @switch in templates (Angular 17+).
- Dependency Injection: inject() function or constructor injection.
- Routing: provideRouter(routes) in app config. RouterOutlet, RouterLink.
- HTTP: provideHttpClient() + inject(HttpClient) for API calls.
- Forms: FormsModule for template-driven, ReactiveFormsModule for reactive forms.`,
  },

  // ---- General / Tailwind ----
  {
    id: "tailwind-patterns",
    framework: "general",
    title: "Tailwind CSS Patterns",
    content: `Tailwind CSS Best Practices:
- Responsive: Use sm:, md:, lg:, xl: prefixes. Mobile-first approach.
- Dark mode: dark: prefix. Configure in tailwind.config.
- Custom colors: Extend theme in config. Use CSS variables for dynamic themes.
- Animation: animate-spin, animate-pulse, animate-bounce. Custom with keyframes.
- Layout: flex, grid, container, space-x/y, gap.
- Typography: text-xs through text-9xl. font-light through font-black. tracking-, leading-.
- Components: Use @apply in CSS for repeated patterns. Or extract to React components.
- Gradients: bg-gradient-to-r from-blue-500 to-purple-600.
- Hover/Focus: hover:, focus:, focus-visible:, active:, group-hover:.
- Container queries: @container for component-level responsive design.`,
  },
  {
    id: "ui-best-practices",
    framework: "general",
    title: "Modern UI/UX Patterns",
    content: `Modern UI/UX Patterns:
- Loading states: Skeleton screens > spinners. Show content shape while loading.
- Empty states: Helpful illustration + clear CTA. Don't just say "No data".
- Error states: Friendly message + retry action. Don't show raw errors.
- Toasts/Notifications: Bottom-right for success/info. Top for errors/warnings.
- Forms: Inline validation, helpful error messages, disable submit until valid.
- Modals: Focus trap, escape to close, click outside to close.
- Tables: Sticky headers, row hover, pagination or infinite scroll.
- Navigation: Breadcrumbs for deep pages, sidebar for app navigation.
- Accessibility: ARIA labels, keyboard navigation, color contrast, focus visible.
- Microinteractions: Subtle hover effects, smooth transitions, haptic feedback.`,
  },
];

// ============================================
// Simple Keyword-Based RAG Retrieval
// ============================================
// For a weekend project, we use keyword matching instead of embeddings.
// Still impressive and functional!

const skillKeywords: Record<string, string[]> = {
  "react-hooks": ["hook", "usestate", "useeffect", "usememo", "usecallback", "useref", "state", "effect", "memo"],
  "react-patterns": ["component", "pattern", "composition", "error boundary", "suspense", "portal", "render prop"],
  "nextjs-app-router": ["route", "routing", "page", "layout", "loading", "server component", "client component", "api route", "metadata"],
  "nextjs-data-fetching": ["fetch", "data", "cache", "revalidate", "server action", "ssr", "ssg", "isr", "streaming"],
  "vue-composition": ["ref", "reactive", "computed", "watch", "composable", "setup", "provide", "inject", "lifecycle"],
  "vue-patterns": ["slot", "v-model", "teleport", "pinia", "store", "dynamic component", "keep-alive"],
  "angular-standalone": ["standalone", "signal", "inject", "control flow", "directive", "pipe", "rxjs", "observable"],
  "tailwind-patterns": ["tailwind", "css", "style", "responsive", "dark mode", "animation", "gradient", "hover", "layout", "grid", "flex"],
  "ui-best-practices": ["ui", "ux", "loading", "skeleton", "empty state", "error", "toast", "modal", "form", "table", "accessible"],
};

/**
 * Retrieve relevant skills based on user message and project framework.
 * Returns the top-N most relevant skill documents.
 */
export function retrieveSkills(
  userMessage: string,
  framework: Framework,
  topK: number = 3
): Skill[] {
  const msgLower = userMessage.toLowerCase();
  const scored: Array<{ skill: Skill; score: number }> = [];

  for (const skill of skills) {
    // Framework match bonus
    const frameworkMatch =
      skill.framework === framework || skill.framework === "general";
    if (!frameworkMatch) continue;

    // Keyword matching
    const keywords = skillKeywords[skill.id] || [];
    let score = 0;

    for (const kw of keywords) {
      if (msgLower.includes(kw)) {
        score += 2;
      }
    }

    // Title relevance
    if (msgLower.includes(skill.title.toLowerCase().split(" ")[0])) {
      score += 1;
    }

    // Framework exact match bonus
    if (skill.framework === framework) {
      score += 1;
    }

    if (score > 0) {
      scored.push({ skill, score });
    }
  }

  // Sort by score descending, return top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.skill);
}
