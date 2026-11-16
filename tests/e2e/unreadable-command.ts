/**
 * A picture lure that also prints the command in the page, but not so a person can read it.
 * The command is passed in so this file does not carry a shell literal.
 */
export function unreadableCommandPages(command: string): Record<string, string> {
  const shown = command.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const quoted = command.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const copy = `<button id="copy" onclick="var t=document.createElement('textarea');t.value='${quoted}';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Copy</button>`;
  const page = (hidden: string) =>
    `<!doctype html><title>Check</title><h1>Follow the picture</h1><img alt="">${hidden}${copy}`;
  return {
    "/ink-lure": page(`<p style="color:#fff;background:#fff">${shown}</p>`),
    "/tiny-lure": page(`<p style="font-size:1px">${shown}</p>`),
    "/fade-lure": page(`<p style="opacity:0">${shown}</p>`),
    "/offscreen-lure": page(`<p style="position:absolute;left:-9999px">${shown}</p>`),
    "/clip-lure": page(`<div style="overflow:hidden;height:0"><p>${shown}</p></div>`),
  };
}

/** The same command, readable, but split the way a highlighted code block is. */
export function splitCommandPage(command: string): string {
  const quoted = command.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const parts = command
    .split(" ")
    .map((word) => `<span>${word.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`)
    .join(" ");
  return `<!doctype html><title>Install</title><h1>Install the CLI</h1><pre><code>${parts}</code></pre><button id="copy" onclick="var t=document.createElement('textarea');t.value='${quoted}';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Copy</button>`;
}
