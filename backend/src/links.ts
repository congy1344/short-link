export type {
  ClickEventInput,
  ClickStatsEvent,
  CodeGenerator,
  CreateLinkInput,
  CreatedLink,
  LinkCache,
  LinkDatabase,
  LinksRouteOptions,
  OwnerLink,
  RedirectLink,
  UpdateLinkData,
  UpdatedLink
} from "./links/types.js";

export { linksRoutes } from "./links/routes.js";
export { createShortLink, generateShortCode, ShortCodeConflictError } from "./links/service.js";
export { parseCreateLinkBody, parseUpdateLinkBody } from "./links/validation.js";

