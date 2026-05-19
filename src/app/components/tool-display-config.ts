export interface ToolDisplayInfo {
  /** Friendly label shown as header when result is ready */
  label: string;
  /** Present-continuous text shown while tool is running */
  loadingText: string;
  /** SVG icon path(s) for the tool — used inside a 16x16 viewBox */
  iconPath: string;
  /** Tailwind color classes for the icon */
  iconColor: string;
  /** Whether the result section starts collapsed (default: true) */
  defaultCollapsed?: boolean;
}

export const TOOL_DISPLAY: Record<string, ToolDisplayInfo> = {
  webSearch: {
    label: "Searched the web",
    loadingText: "Searching the web",
    iconPath:
      "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
    iconColor: "text-blue-400",
  },
  scrapeWebpage: {
    label: "Read a webpage",
    loadingText: "Reading webpage",
    iconPath:
      "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
    iconColor: "text-violet-400",
  },
  checkMetaConnection: {
    label: "Checked Meta connection",
    loadingText: "Checking Meta connection",
    iconPath:
      "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.553-3.068a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.25 9.818",
    iconColor: "text-blue-400",
  },
  disconnectMeta: {
    label: "Disconnected Meta account",
    loadingText: "Disconnecting Meta account",
    iconPath:
      "M13.181 8.68a4.503 4.503 0 011.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 006.364 6.365l.498-.499m0 0L15 15.31m-4.578 4.517a4.5 4.5 0 01-6.364 0m15.526-7.511a4.503 4.503 0 00-6.405-1.903m0 0L9 5.69m4.578-4.517a4.5 4.5 0 016.364 0",
    iconColor: "text-amber-400",
  },
  getPages: {
    label: "Fetched Facebook Pages",
    loadingText: "Fetching your Pages",
    iconPath:
      "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z",
    iconColor: "text-blue-400",
  },
  getAdAccounts: {
    label: "Fetched ad accounts",
    loadingText: "Fetching ad accounts",
    iconPath:
      "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z",
    iconColor: "text-blue-400",
  },
  suggestTargeting: {
    label: "Analyzed audience targeting",
    loadingText: "Analyzing audience",
    iconPath:
      "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
    iconColor: "text-amber-400",
  },
  generateAdCopy: {
    label: "Generated ad copy",
    loadingText: "Writing ad copy",
    iconPath:
      "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
    iconColor: "text-emerald-400",
  },
  generateAdImage: {
    label: "Generated ad image",
    loadingText: "Creating image",
    iconPath:
      "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z",
    iconColor: "text-pink-400",
  },
  createCampaign: {
    label: "Created campaign",
    loadingText: "Creating campaign",
    iconPath:
      "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    iconColor: "text-emerald-400",
  },
  createAdSet: {
    label: "Created ad set",
    loadingText: "Creating ad set",
    iconPath:
      "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z",
    iconColor: "text-emerald-400",
  },
  createAdCreative: {
    label: "Created ad creative",
    loadingText: "Creating ad creative",
    iconPath:
      "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42",
    iconColor: "text-emerald-400",
  },
  createAd: {
    label: "Created ad",
    loadingText: "Creating ad",
    iconPath:
      "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z",
    iconColor: "text-emerald-400",
  },
  getPixels: {
    label: "Fetched Meta Pixels",
    loadingText: "Fetching pixels",
    iconPath:
      "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
    iconColor: "text-violet-400",
  },
  createPixel: {
    label: "Created Meta Pixel",
    loadingText: "Creating pixel",
    iconPath:
      "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
    iconColor: "text-emerald-400",
  },
  generateAdVideo: {
    label: "Generated ad video",
    loadingText: "Creating video",
    iconPath:
      "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z",
    iconColor: "text-rose-400",
  },
  generateMultiFormatImages: {
    label: "Generated multi-format images",
    loadingText: "Creating all formats",
    iconPath:
      "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
    iconColor: "text-pink-400",
  },
  createVideoAdCreative: {
    label: "Created video ad creative",
    loadingText: "Creating video creative",
    iconPath:
      "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z",
    iconColor: "text-emerald-400",
  },
  createCarouselAdCreative: {
    label: "Created carousel ad creative",
    loadingText: "Creating carousel creative",
    iconPath:
      "M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75l-5.571-3m11.142 0l4.179 2.25L12 17.25l-9.75-5.25 4.179-2.25",
    iconColor: "text-emerald-400",
  },
  generateCreativeMatrix: {
    label: "Generated creative matrix",
    loadingText: "Generating variant matrix",
    iconPath:
      "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
    iconColor: "text-orange-400",
  },
  searchInterests: {
    label: "Searched targeting interests",
    loadingText: "Searching interests",
    iconPath:
      "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
    iconColor: "text-amber-400",
  },
  getCampaigns: {
    label: "Fetched campaigns",
    loadingText: "Fetching campaigns",
    iconPath:
      "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
    iconColor: "text-blue-400",
  },
  getAdSets: {
    label: "Fetched ad sets",
    loadingText: "Fetching ad sets",
    iconPath:
      "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
    iconColor: "text-blue-400",
  },
  getAds: {
    label: "Fetched ads",
    loadingText: "Fetching ads",
    iconPath:
      "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
    iconColor: "text-blue-400",
  },
  getAdInsights: {
    label: "Pulled performance insights",
    loadingText: "Pulling insights",
    iconPath:
      "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    iconColor: "text-cyan-400",
  },
};

/** Get display info for a tool, with sensible defaults for unknown tools */
export function getToolDisplay(toolName: string): ToolDisplayInfo {
  return (
    TOOL_DISPLAY[toolName] ?? {
      label: toolName.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
      loadingText: "Working",
      iconPath: "M11.42 15.17l-5.384-3.083A.5.5 0 005.5 12.5v6.166a.5.5 0 00.536.483l5.384-.308a.5.5 0 00.464-.483V15.67a.5.5 0 00-.464-.5z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      iconColor: "text-foreground-muted",
    }
  );
}
