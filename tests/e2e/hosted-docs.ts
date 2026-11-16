/** A doc page whose install command is visible in a code block. The command is passed in. */
export function hostedDocsPage(command: string): string {
  const shown = command.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const literal = command.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `<!doctype html><title>Install</title><h1>Install the CLI</h1><pre><code>${shown}</code></pre><button id="copy" onclick="var t=document.createElement('textarea');t.value='${literal}';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Copy</button>`;
}
