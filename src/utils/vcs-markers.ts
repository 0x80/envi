/**
 * VCS markers that indicate a repository root or a nested working tree.
 *
 * Lives in its own module (no imports) so both `findRepoRoot` (which depends
 * on interactive prompt code) and `findEnvFiles` (a pure filesystem utility)
 * can share the constant without `findEnvFiles` transitively pulling
 * `@clack/prompts` into its dependency graph.
 *
 * `as const` makes the value a readonly tuple at the type level so callers
 * can't accidentally `.push` to it. The runtime value is still a regular
 * array — `.some` and other read methods work as usual.
 */
export const VCS_MARKERS = [".git", ".jj", ".hg", ".svn"] as const;
