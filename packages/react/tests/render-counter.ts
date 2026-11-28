// Counts the function components React renders, through the hook React DevTools uses: React DOM
// tells it every commit (it must be installed before React DOM loads: `tests/setup.ts` imports this
// first). A component counts when it performed work in the commit (React's `PerformedWork` flag),
// so a memoised one React skipped, or a subtree it bailed out of, does not.

/** React's fiber tags of function components: function, `forwardRef`, `memo`, simple `memo`. */
const FUNCTION_TAGS = new Set([0, 11, 14, 15]);
/** React's `PerformedWork` flag. */
const PERFORMED_WORK = 1;

interface Fiber {
    tag: number;
    flags: number;
    type: unknown;
    child: Fiber | null;
    sibling: Fiber | null;
    alternate: Fiber | null;
}

/** What a counting window saw: commits, and the components rendered by name. */
export interface RenderCount {
    commits: number;
    renders: number;
    byName: Record<string, number>;
}

let counting: RenderCount | null = null;

function nameOf(fiber: Fiber): string {
    const type = fiber.type as
        | {
              displayName?: string;
              name?: string;
              render?: { displayName?: string; name?: string };
              type?: { displayName?: string; name?: string };
          }
        | undefined;
    if (!type) return "anonymous";
    const named = type.render ?? type.type ?? type;
    return named.displayName || named.name || "anonymous";
}

function countCommit(root: { current: Fiber }): void {
    if (!counting) return;
    counting.commits++;
    const stack: Fiber[] = [root.current];
    while (stack.length > 0) {
        const fiber = stack.pop() as Fiber;
        if (FUNCTION_TAGS.has(fiber.tag) && fiber.flags & PERFORMED_WORK) {
            counting.renders++;
            const name = nameOf(fiber);
            counting.byName[name] = (counting.byName[name] ?? 0) + 1;
        }
        if (fiber.sibling) stack.push(fiber.sibling);
        // a subtree React bailed out of keeps its old fibers (and their old flags)
        if (fiber.child && fiber.child !== fiber.alternate?.child) {
            stack.push(fiber.child);
        }
    }
}

if (typeof window !== "undefined") {
    (
        globalThis as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown }
    ).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true,
        renderers: new Map(),
        isDisabled: false,
        inject: () => 1,
        checkDCE() {},
        onScheduleFiberRoot() {},
        onCommitFiberUnmount() {},
        onPostCommitFiberRoot() {},
        onCommitFiberRoot(_id: number, root: { current: Fiber }) {
            countCommit(root);
        },
    };
}

/** Counts the components `run` renders (in the commits it causes). */
export function countRenders(run: () => void): RenderCount {
    const count: RenderCount = { commits: 0, renders: 0, byName: {} };
    counting = count;
    try {
        run();
    } finally {
        counting = null;
    }
    return count;
}
