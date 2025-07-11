export const APP_URL = process.env.NEXT_PUBLIC_APP_URL as string;

export const API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === 'true';

export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_TEST = process.env.NODE_ENV === 'test';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const NEXT_PUBLIC_APP_CODE_NAME = (process.env
  .NEXT_PUBLIC_APP_CODE_NAME ?? `mediaapp`) as string;
export const COOKIES_PREFIX =
  (process.env.NODE_ENV === `development` ? `__Dev-` : ``) +
  `${NEXT_PUBLIC_APP_CODE_NAME}`;

export const IS_DEBUG_MODE =
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true';
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_SERVER = typeof window === 'undefined';

export const THEME_DARK = 'dark';
export const THEME_LIGHT = 'light';
export const THEME_SYSTEM = 'system';

export const RECENT_ARTICLES_LIMIT = 2;
export const PAGINATE_STORIES_LIMIT = 8;

export const APP_NAME =
  (process.env.NEXT_PUBLIC_APP_NAME as string) ?? `Media-FE`;
const d = new Date();
let year = d.getFullYear();
export const COPYRIGHT_TEXT =
  (process.env.NEXT_PUBLIC_COPYRIGHT_TEXT as string) ??
  `© Copyright ${year} ${APP_NAME} Inc. All rights reserved.`;

export const SECOND = 1000;
export const MINUTE = 60 * 1000;
export const HOUR = 60 * 60 * 1000;

// NEW: Profile Approval Mode
export const PROFILE_APPROVAL_STRICT_MODE = process.env.NEXT_PUBLIC_PROFILE_APPROVAL_STRICT_MODE === 'true';
// src/config/constants.ts
