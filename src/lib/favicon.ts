type FaviconColors = {
  background: string;
  stroke: string;
  mark: string;
};

const FALLBACK_COLORS: FaviconColors = {
  background: "#fafafa",
  stroke: "#986801",
  mark: "#4078f2",
};

function cssVariable(
  styles: CSSStyleDeclaration,
  name: string,
  fallback: string,
) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function readFaviconColors(): FaviconColors {
  const rootStyles = getComputedStyle(document.documentElement);

  return {
    background: cssVariable(rootStyles, "--ed-bg", FALLBACK_COLORS.background),
    stroke: cssVariable(rootStyles, "--ed-orange", FALLBACK_COLORS.stroke),
    mark: cssVariable(rootStyles, "--ed-blue", FALLBACK_COLORS.mark),
  };
}

function createFaviconSvg({ background, stroke, mark }: FaviconColors) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="12" fill="${background}" stroke="${stroke}" stroke-width="5"/><rect x="19" y="25" width="26" height="5" rx="2.5" fill="${mark}"/><rect x="19" y="34" width="26" height="5" rx="2.5" fill="${mark}"/></svg>`;
}

function getFaviconLink() {
  const existingDynamicLink = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"][data-dynamic-favicon="true"]',
  );
  if (existingDynamicLink) return existingDynamicLink;

  const existingSvgLink = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"][type="image/svg+xml"]',
  );
  const link = existingSvgLink ?? document.createElement("link");

  link.rel = "icon";
  link.type = "image/svg+xml";
  link.dataset.dynamicFavicon = "true";

  if (!link.parentNode) {
    document.head.append(link);
  }

  return link;
}

export function installFaviconSync() {
  const updateFavicon = () => {
    const svg = createFaviconSvg(readFaviconColors());
    getFaviconLink().href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  updateFavicon();

  const rootObserver = new MutationObserver(updateFavicon);
  rootObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => rootObserver.disconnect());
  }
}
