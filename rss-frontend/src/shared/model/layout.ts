export const LAYOUTS = ["three", "outlook", "split"] as const;
export type Layout = (typeof LAYOUTS)[number];

export function resolveLayout(layout: string | undefined): Layout {
    return (LAYOUTS as readonly string[]).includes(layout ?? "") ? (layout as Layout) : "three";
}
