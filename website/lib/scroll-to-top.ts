/**
 * Reset scroll on the window and common iOS/WebKit roots. Next.js client
 * navigation does not always move the scroll position; Safari often needs
 * documentElement/body + a delayed second pass.
 */
export function forceScrollToTop(): void {
  if (typeof window === "undefined") return;

  const apply = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
  };

  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}
