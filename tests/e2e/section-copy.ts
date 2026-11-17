/**
 * A visible install line copied as one line of a longer block.
 * The other lines are not on the page. The command is passed in.
 */
export function sectionCopyPage(command: string, shown: boolean): string {
  const visible = command.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const blob = `Notes kept in the editor.\n${command}\nSee the table above.`;
  const literal = blob.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  const body = shown ? `<pre><code>${visible}</code></pre>` : "<p>Notes for this section.</p>";
  return `<!doctype html><title>Section</title><h1>Install</h1>${body}<button id="copy" onclick="var t=document.createElement('textarea');t.value='${literal}';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Copy</button>`;
}
