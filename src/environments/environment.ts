/**
 * Site configuration. Edit and save — the dev server reloads automatically.
 */
export const environment = {
  /** Show the colour-theme picker (bottom-right) to preview palettes live. */
  themePicker: false,

  /**
   * false: everyone gets the full animated site, even with the OS "reduce animations" setting on (like most
   * award sites). Visitors can still switch motion off with the footer toggle.
   * true: honour the OS setting and show the calm version plus an "Enable motion" notice.
   */
  respectReducedMotion: false,

  /**
   * First-visit theme: 'dark', 'light' or 'system' (follow the visitor's OS). The sun/moon toggle in
   * the navbar overrides it and is remembered per browser.
   */
  defaultTheme: 'dark' as 'dark' | 'light' | 'system',

  /**
   * Owner-only admin: résumé upload + content studio (projects, experience, highlights, skills, profile),
   * published without a redeploy. Open it from the footer lock, the chatbot ("edit my portfolio") or #admin.
   * Needs the Netlify Functions in /netlify, i.e. a Git or CLI deploy; set false for a static-only deploy.
   */
  ownerAdmin: true,

  /**
   * "Ask my AI" chat (bottom-right). Answers from the portfolio data with no setup; if ANTHROPIC_API_KEY is
   * set on Netlify it is answered by Claude instead.
   */
  askAi: true,

  /**
   * Visitor counter (bottom-left). Displayed value = baseline + real visits, counted by the free
   * abacus.jasoncameron.dev API (one hit per browser session). Dev builds use a separate key.
   */
  views: {
    enabled: true,
    baseline: 7000,
    namespace: 'mukundbajpai-portfolio',
    key: 'views',
  },
};
