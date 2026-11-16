/**
 * Each page replaces one builtin after it loads, then copies a command.
 * The command text is passed in so this file does not carry a shell literal.
 */
export function builtinOverridePages(strong: string, weak: string, step: string): Record<string, string> {
  const quoted = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const copy = (value: string) =>
    `<button id="copy" onclick="var t=document.createElement('textarea');t.value='${quoted(value)}';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Copy</button>`;
  const stepText = JSON.stringify(step);
  const late = `${"<div></div>".repeat(300)}<style>#s::before{content:${stepText}}</style><div id="s"></div>`;
  return {
    "/override-test": `<!doctype html><title>Check</title><script>RegExp.prototype.test=function(){return false}</script>${copy(strong)}`,
    "/override-inner": `<!doctype html><title>Check</title><h1>Follow the steps</h1><p>${step}</p><script>Object.defineProperty(HTMLElement.prototype,"innerText",{configurable:true,get:function(){return ""}})</script>${copy(weak)}`,
    "/override-now": `<!doctype html><title>Check</title><h1>Follow the steps</h1>${late}<script>var jumped=false;function jump(){if(!jumped){jumped=true;return 0}return 1e12}performance.now=jump;try{Performance.prototype.now=jump}catch(e){}</script>${copy(weak)}`,
    "/override-box": `<!doctype html><title>Check</title><h1>Follow the steps</h1>${late}<script>Element.prototype.getBoundingClientRect=function(){return {top:0,bottom:0,left:0,right:0,width:0,height:0,x:0,y:0}}</script>${copy(weak)}`,
  };
}
