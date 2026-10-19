/**
 * Requirement regions for the demo. Business data lives in the host project;
 * the toolkit only knows the shape: { key, title, status, routes }.
 */
export const FRS_REGISTRY = [
  { key: "OVERVIEW", title: "Workspace overview", status: "confirmed", routes: ["/overview"] },
  { key: "EXPERIMENTS", title: "Experiments", status: "confirmed", routes: ["/experiments"] },
  { key: "REVIEWS", title: "Review queue", status: "in_dev", routes: ["/reviews"] },
  { key: "UI_SPEC", title: "UI spec", status: "accepting", routes: ["/ui-spec"] },
];
