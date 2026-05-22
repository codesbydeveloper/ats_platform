/** Default rows per page for GET /api/teachers (server pagination). */
export const TEACHERS_DEFAULT_PAGE_SIZE = 200;

/** Optional sizes if the API allows them (backend must not cap below these). */
export const TEACHERS_PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
