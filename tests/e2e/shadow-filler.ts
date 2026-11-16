/**
 * Open shadow roots full of filler, then a visible ::before lure.
 * The step text is passed in so this file does not carry a shell literal.
 * The filler sits in a zero-height box so the lure stays on screen.
 */
export function shadowFillerPage(step: string): string {
  const text = JSON.stringify(step);
  return `<!doctype html><title>Check</title><div id="pad" style="height:0;overflow:hidden"></div><h1>Follow the steps</h1><style>#s::before{content:${text}}</style><div id="s"></div><script>var pad=document.getElementById("pad");for(var i=0;i<2000;i++){var el=document.createElement("div");el.attachShadow({mode:"open"}).textContent="note";pad.appendChild(el);}</script>`;
}
