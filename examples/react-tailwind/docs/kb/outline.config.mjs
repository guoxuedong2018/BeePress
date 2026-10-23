/** Synthetic outline for the demo content workspace. */
export const OUTLINE = [
  {
    dir: "guides",
    name: "Guides",
    pages: [
      {
        file: "review-flow.md",
        title: "Run a review",
        kind: "howto",
        lead: "Open the prototype, leave anchored comments, and resolve them with the team.",
        pages: ["/overview", "/reviews"],
        frs: ["OVERVIEW", "REVIEWS"],
      },
    ],
  },
  {
    dir: "concepts",
    name: "Concepts",
    overview: {
      title: "Anchors",
      kind: "concept",
      lead: "How BuilderHarness keeps a comment attached to the right element.",
      pages: ["/overview"],
      frs: ["OVERVIEW"],
    },
    pages: [
      {
        file: "three-layers.md",
        title: "Three anchor layers",
        kind: "concept",
        lead: "Source coordinates, component semantics and geometry, in that order.",
        pages: ["/overview"],
        frs: ["OVERVIEW"],
      },
    ],
  },
];
