/**
 * Every user-facing signal text, in every shipped language, in one place.
 *
 * - `[title, explanation]`, placeholders `$1`…`$3` filled from the signal's `args`.
 * - The engine builds English copy from here; the UI re-renders in the browser language.
 * - tests/unit/signal-copy.test.ts enforces: every key exists in every language with the
 *   same placeholders, and every signal the engine can emit has a key here.
 *
 * Style: say what is wrong and what to do. One or two short sentences. No jargon on
 * warnings a non-technical person will see; hygiene findings say they are not a threat.
 */
export type SignalLang = "en" | "de";
export const SIGNAL_LANGS: SignalLang[] = ["en", "de"];

type Copy = readonly [title: string, explanation: string];

export const SIGNAL_COPY: Record<string, Record<SignalLang, Copy>> = {
  parse: {
    en: ["Address could not be checked", "$1"],
    de: ["Adresse nicht prüfbar", "$1"],
  },
  "https-ok": {
    en: ["HTTPS", "The connection is encrypted."],
    de: ["HTTPS", "Die Verbindung ist verschlüsselt."],
  },
  "https-plain": {
    en: ["Not encrypted", "Anyone on the same network can read or change this page, including passwords."],
    de: ["Nicht verschlüsselt", "Jeder im selben Netzwerk kann diese Seite mitlesen oder verändern – auch Passwörter."],
  },
  "https-local": {
    en: ["Not encrypted", "Normal for a router or NAS at home. Avoid it on public Wi-Fi."],
    de: ["Nicht verschlüsselt", "Bei Router oder NAS zu Hause normal. In öffentlichem WLAN vermeiden."],
  },
  userinfo: {
    en: ["Hidden destination in the address", "The address puts “user:password@” before the host to disguise where the link really goes."],
    de: ["Versteckte Zieladresse", "Die Adresse setzt „Benutzer:Passwort@“ vor den Host, um das echte Ziel zu verschleiern."],
  },
  "ip-local": {
    en: ["Local network device", "This address is inside your own network (router, NAS, printer)."],
    de: ["Gerät im eigenen Netz", "Diese Adresse liegt in deinem eigenen Netzwerk (Router, NAS, Drucker)."],
  },
  "ip-public": {
    en: ["IP address instead of a name", "Real sign-in pages almost never use a bare IP address."],
    de: ["IP-Adresse statt Name", "Echte Anmeldeseiten verwenden fast nie eine nackte IP-Adresse."],
  },
  "dns-rebind": {
    en: ["Points into your local network", "This name leads to a private address. Websites use that trick to reach routers and local apps."],
    de: ["Zeigt ins lokale Netz", "Dieser Name führt zu einer privaten Adresse. Webseiten erreichen so Router und lokale Dienste."],
  },
  popular: {
    en: ["Established site", "One of the 50,000 most-linked websites. Its name is not treated as a brand lookalike."],
    de: ["Etablierte Website", "Gehört zu den 50.000 meistverlinkten Websites. Der Name wird nicht als Marken-Imitat gewertet."],
  },
  "free-hosting": {
    en: ["Free hosting", "Published on $1, where anyone can create a site. Banks, shops, and wallets never ask you to sign in there."],
    de: ["Kostenloses Hosting", "Veröffentlicht auf $1, wo jeder eine Seite anlegen kann. Banken, Shops und Wallets lassen dich dort nie anmelden."],
  },
  "cloud-hosting": {
    en: ["Cloud app hosting", "Runs on $1, which hosts company apps and phishing kits alike."],
    de: ["Cloud-Hosting", "Läuft auf $1 – dort liegen Firmen-Apps und Phishing-Kits gleichermaßen."],
  },
  "brand-hosted": {
    en: ["$1 named on a hosted page", "Real $1 pages are not served from $2."],
    de: ["$1 auf gehosteter Seite genannt", "Echte $1-Seiten liegen nicht auf $2."],
  },
  blocklist: {
    en: ["On your blocklist", "You blocked this site yourself."],
    de: ["Auf deiner Sperrliste", "Du hast diese Seite selbst gesperrt."],
  },
  "known-test": {
    en: ["Known malicious test host", "One of the public test addresses for malware warnings."],
    de: ["Bekannter Test-Schadhost", "Eine der öffentlichen Testadressen für Malware-Warnungen."],
  },
  "rep-listed": {
    en: ["Listed by threat intelligence", "$1 lists this domain as dangerous."],
    de: ["Von Threat Intelligence gelistet", "$1 führt diese Domain als gefährlich."],
  },
  "rep-ok": {
    en: ["Domain reputation", "$1 does not list this domain."],
    de: ["Domain-Reputation", "$1 führt diese Domain nicht."],
  },
  "rep-unavailable": {
    en: ["Domain reputation", "The online check is unavailable right now. Local protection is still active."],
    de: ["Domain-Reputation", "Die Online-Prüfung ist gerade nicht erreichbar. Der lokale Schutz bleibt aktiv."],
  },
  "rep-off": {
    en: ["Domain reputation", "Online check is off. Local protection is active."],
    de: ["Domain-Reputation", "Online-Prüfung ist aus. Der lokale Schutz ist aktiv."],
  },
  certificate: {
    en: ["Certificate", "Chrome checks certificates itself and does not share the details with extensions."],
    de: ["Zertifikat", "Chrome prüft Zertifikate selbst und gibt keine Details an Erweiterungen weiter."],
  },
  "domain-age": {
    en: ["Domain age", "Not checked: that would mean sending the address to a registry service."],
    de: ["Domain-Alter", "Nicht geprüft – dafür müsste die Adresse an einen Registry-Dienst gesendet werden."],
  },
  "homograph-mixed": {
    en: ["Mixed alphabets in the name", "Latin letters mixed with Cyrillic or Greek ones that look the same – a classic way to fake a familiar name."],
    de: ["Gemischte Alphabete im Namen", "Lateinische Buchstaben, gemischt mit gleich aussehenden kyrillischen oder griechischen – ein klassischer Trick, um bekannte Namen zu fälschen."],
  },
  "homograph-idn": {
    en: ["Internationalized domain", "Uses non-Latin letters ($1). None of them imitate Latin ones."],
    de: ["Internationaler Domainname", "Enthält Sonderzeichen ($1), die keine lateinischen Buchstaben imitieren."],
  },
  "impersonation-ok": {
    en: ["Brand similarity", "The name does not imitate a known brand."],
    de: ["Markenähnlichkeit", "Der Name imitiert keine bekannte Marke."],
  },
  "imp-embedded": {
    en: ["Fake $1 address", "The real $1 address is only a prefix here. You are actually on $2."],
    de: ["Gefälschte $1-Adresse", "Die echte $1-Adresse ist hier nur ein Vorsatz. Tatsächlich bist du auf $2."],
  },
  "imp-confusable": {
    en: ["Looks like $1", "$2 swaps letters for lookalikes. The real $1 is at $3."],
    de: ["Sieht aus wie $1", "$2 tauscht Buchstaben gegen ähnlich aussehende. Das echte $1 findest du unter $3."],
  },
  "imp-other-tld": {
    en: ["Not the official $1 site", "$2 uses the $1 name on an ending $1 does not use. The real site is $3."],
    de: ["Nicht die offizielle $1-Seite", "$2 nutzt den Namen $1 mit einer Endung, die $1 nicht verwendet. Die echte Seite ist $3."],
  },
  "imp-keyword": {
    en: ["Looks like $1", "$2 pairs $1 with words like “login” or “verify”. $1 does not sign you in there; the real site is $3."],
    de: ["Sieht aus wie $1", "$2 kombiniert $1 mit Wörtern wie „login“ oder „verify“. $1 meldet dich dort nicht an – die echte Seite ist $3."],
  },
  "imp-typo": {
    en: ["Close to $1", "$2 is one letter away from $1. That only matters if the page asks for a password."],
    de: ["Ähnlich wie $1", "$2 unterscheidet sich nur durch einen Buchstaben von $1. Relevant nur, wenn die Seite ein Passwort verlangt."],
  },
  "imp-weak": {
    en: ["Mentions $1", "The address contains $1 but is not $3. Fan sites do that too; it only matters if the page asks for credentials."],
    de: ["Erwähnt $1", "Die Adresse enthält $1, ist aber nicht $3. Das machen auch Fanseiten – relevant nur, wenn Zugangsdaten verlangt werden."],
  },
  tld: {
    en: ["Unusual domain ending", "The ending .$1 is cheap and common for throwaway phishing domains."],
    de: ["Ungewöhnliche Domain-Endung", "Die Endung .$1 ist billig und bei Wegwerf-Phishing-Domains verbreitet."],
  },
  subdomains: {
    en: ["Many subdomains", "Deeply nested subdomains can hide the real domain at the end."],
    de: ["Viele Subdomains", "Tief verschachtelte Subdomains können die echte Domain am Ende verstecken."],
  },
  shortener: {
    en: ["Short link", "The real destination is checked as soon as the link redirects."],
    de: ["Kurzlink", "Das eigentliche Ziel wird geprüft, sobald der Link weiterleitet."],
  },
  length: {
    en: ["Very long address", "Unusually long addresses can bury the real destination."],
    de: ["Sehr lange Adresse", "Ungewöhnlich lange Adressen können das eigentliche Ziel verstecken."],
  },
  encoding: {
    en: ["Odd URL encoding", "Heavy or nested encoding can hide the real destination."],
    de: ["Auffällige Kodierung", "Starke oder verschachtelte Kodierung kann das eigentliche Ziel verstecken."],
  },
  redirect: {
    en: ["Suspicious redirect", "The address carries another address inside it – a common phishing redirect."],
    de: ["Verdächtige Weiterleitung", "Die Adresse enthält eine weitere Adresse – eine typische Phishing-Weiterleitung."],
  },
  "login-http": {
    en: ["Sign-in over HTTP", "This looks like a sign-in page without encryption. Do not enter a password."],
    de: ["Anmeldung über HTTP", "Das sieht aus wie eine Anmeldeseite ohne Verschlüsselung. Gib kein Passwort ein."],
  },
  login: {
    en: ["Sign-in address on an unusual host", "Real login pages rarely use this kind of host or address."],
    de: ["Anmeldeadresse auf ungewöhnlichem Host", "Echte Anmeldeseiten nutzen selten diese Art von Host oder Adresse."],
  },
  "session-url": {
    en: ["Session ID in the address", "The address carries a login session ID that can leak through history and shared links."],
    de: ["Sitzungs-ID in der Adresse", "Die Adresse enthält eine Sitzungs-ID, die über Verlauf und geteilte Links nach außen gelangen kann."],
  },
  port: {
    en: ["Unusual port", "This site uses port $1 instead of a standard web port."],
    de: ["Ungewöhnlicher Port", "Diese Seite nutzt Port $1 statt eines Standard-Web-Ports."],
  },
  "double-ext": {
    en: ["Disguised file", "The address looks like a document but points at a program. A malware trick."],
    de: ["Getarnte Datei", "Die Adresse sieht aus wie ein Dokument, zeigt aber auf ein Programm. Ein Malware-Trick."],
  },
  executable: {
    en: ["Program over HTTP", "A program offered without encryption can be swapped on the way. Do not run it."],
    de: ["Programm über HTTP", "Ein unverschlüsselt angebotenes Programm kann unterwegs ausgetauscht werden. Nicht ausführen."],
  },
  bidi: {
    en: ["Hidden characters in the address", "Invisible or right-to-left characters make the address look different from what it is."],
    de: ["Versteckte Zeichen in der Adresse", "Unsichtbare oder Rechts-nach-links-Zeichen lassen die Adresse anders aussehen, als sie ist."],
  },
  "url-prototype": {
    en: ["Script attack in the address", "The address tries to tamper with the page's scripts (prototype pollution)."],
    de: ["Skript-Angriff in der Adresse", "Die Adresse versucht, die Skripte der Seite zu manipulieren (Prototype Pollution)."],
  },
  "clickfix-url": {
    en: ["Fake verification page", "Looks like a CAPTCHA on an unusual host. These pages tell you to paste a command – never do that."],
    de: ["Gefälschte Verifizierung", "Sieht aus wie ein CAPTCHA auf einem ungewöhnlichen Host. Solche Seiten fordern dich auf, einen Befehl einzufügen – tu das nie."],
  },
  "browser-update-url": {
    en: ["Fake browser update", "Chrome updates itself. It never asks you to download an update from a website."],
    de: ["Gefälschtes Browser-Update", "Chrome aktualisiert sich selbst und fordert dich nie auf, ein Update von einer Webseite zu laden."],
  },
  "passkey-lookalike": {
    en: ["Passkey on a lookalike", "Do not register a passkey or security key here. Open the real site from a bookmark."],
    de: ["Passkey auf Imitat-Seite", "Registriere hier keinen Passkey oder Sicherheitsschlüssel. Öffne die echte Seite über ein Lesezeichen."],
  },
  "oauth-proxy": {
    en: ["Sign-in through a third party", "This host wraps a Google, Microsoft, or Apple sign-in. Kits use that to take over accounts without your password."],
    de: ["Anmeldung über Dritte", "Dieser Host bettet eine Google-, Microsoft- oder Apple-Anmeldung ein. So übernehmen Kits Konten ohne dein Passwort."],
  },
  "crypto-secret-url": {
    en: ["Recovery phrase requested", "No real wallet asks for your recovery phrase on a website. Never enter it here."],
    de: ["Wiederherstellungsphrase verlangt", "Keine echte Wallet fragt auf einer Webseite nach deiner Wiederherstellungsphrase. Gib sie hier nie ein."],
  },
  "crypto-claim-url": {
    en: ["Crypto claim bait", "Airdrop or mint lure on an unusual host. Treat every wallet approval here as hostile."],
    de: ["Krypto-Köder", "Airdrop- oder Mint-Köder auf einem ungewöhnlichen Host. Behandle jede Wallet-Freigabe hier als feindlich."],
  },
  "ai-credential-url": {
    en: ["AI login on an unofficial site", "This is not the official ChatGPT, Claude, or Gemini site. Do not enter your password or API key."],
    de: ["KI-Login auf inoffizieller Seite", "Das ist nicht die offizielle Seite von ChatGPT, Claude oder Gemini. Gib weder Passwort noch API-Schlüssel ein."],
  },
  "password-http": {
    en: ["Password field without encryption", "Anything you type here can be read on the network."],
    de: ["Passwortfeld ohne Verschlüsselung", "Alles, was du hier eingibst, kann im Netzwerk mitgelesen werden."],
  },
  "insecure-form": {
    en: ["Form sends data unencrypted", "Do not enter passwords or personal data here."],
    de: ["Formular sendet unverschlüsselt", "Gib hier keine Passwörter oder persönlichen Daten ein."],
  },
  "overlay-clickjack": {
    en: ["Invisible layer over the page", "An invisible frame covers the page to capture your clicks."],
    de: ["Unsichtbare Ebene über der Seite", "Ein unsichtbarer Rahmen liegt über der Seite und fängt deine Klicks ab."],
  },
  "permission-bait": {
    en: ["Full-page dialog", "A large dialog covers the site, often a cookie banner. Be careful with download or permission prompts on it."],
    de: ["Seitenfüllender Dialog", "Ein großer Dialog überdeckt die Seite, oft ein Cookie-Banner. Vorsicht bei Download- oder Berechtigungsabfragen darauf."],
  },
  "wallet-http": {
    en: ["Wallet on an unencrypted page", "Anyone on the network can change what this page shows your wallet."],
    de: ["Wallet auf unverschlüsselter Seite", "Jeder im Netzwerk kann verändern, was diese Seite deiner Wallet anzeigt."],
  },
  "seed-form": {
    en: ["Recovery phrase field", "Real wallets never ask for your recovery phrase in a website form. Do not paste it."],
    de: ["Feld für Wiederherstellungsphrase", "Echte Wallets fragen nie in einem Webformular nach deiner Wiederherstellungsphrase. Nicht einfügen."],
  },
  "api-key-field": {
    en: ["API key field", "Fake AI sites collect API keys this way. Check the address before pasting."],
    de: ["Feld für API-Schlüssel", "Gefälschte KI-Seiten sammeln so API-Schlüssel. Prüf die Adresse vor dem Einfügen."],
  },
  "clickfix-clipboard": {
    en: ["Command blocked from your clipboard", "This page tried to copy a PowerShell or terminal command for you to paste. Fundament replaced it. Never paste commands from websites."],
    de: ["Befehl aus der Zwischenablage blockiert", "Diese Seite wollte einen PowerShell- oder Terminal-Befehl zum Einfügen kopieren. Fundament hat ihn ersetzt. Füge nie Befehle von Webseiten ein."],
  },
  "clickfix-unseen": {
    en: ["Shell command copied without instructions", "This page put a terminal command on the clipboard, and the instructions were not in the page text. Don't paste it into Run, PowerShell, or Terminal."],
    de: ["Befehl ohne sichtbare Anweisung", "Die Seite hat einen Terminal-Befehl in die Zwischenablage gelegt. Der Text dazu war nicht zu sehen. Füge ihn nicht in Ausführen, PowerShell oder das Terminal ein."],
  },
  "fullscreen-trap": {
    en: ["Fullscreen over a login", "Fullscreen can fake a browser window. Press Esc and check the real address bar."],
    de: ["Vollbild über einer Anmeldung", "Im Vollbild lässt sich ein Browserfenster vortäuschen. Drück Esc und prüf die echte Adressleiste."],
  },
  "cross-origin-login": {
    en: ["Login sent to another site", "The password form submits to a different domain than the one you are on."],
    de: ["Login geht an eine andere Seite", "Das Passwortformular sendet an eine andere Domain als die, auf der du bist."],
  },
  "mixed-content": {
    en: ["Mixed content", "This HTTPS page still loads parts over HTTP. Site hygiene, not a threat to you."],
    de: ["Gemischte Inhalte", "Diese HTTPS-Seite lädt Teile noch über HTTP. Ein Hygiene-Hinweis, keine Gefahr für dich."],
  },
  "weak-csp": {
    en: ["Weak script policy", "The page allows inline scripts. Site hygiene, not a threat to you."],
    de: ["Schwache Skript-Richtlinie", "Die Seite erlaubt eingebettete Skripte. Ein Hygiene-Hinweis, keine Gefahr für dich."],
  },
  "cookie-flags": {
    en: ["Session cookie readable by scripts", "A session cookie lacks HttpOnly. Site hygiene; Fundament never reads cookie values."],
    de: ["Sitzungs-Cookie für Skripte lesbar", "Einem Sitzungs-Cookie fehlt HttpOnly. Ein Hygiene-Hinweis; Fundament liest nie Cookie-Inhalte."],
  },
  "obfuscated-js": {
    en: ["Obfuscated script", "An inline script hides its code the way packed malware does."],
    de: ["Verschleiertes Skript", "Ein eingebettetes Skript versteckt seinen Code wie gepackte Malware."],
  },
  "prototype-pollution": {
    en: ["Risky script pattern", "An inline script rewrites object prototypes. Site hygiene, not a threat to you."],
    de: ["Riskantes Skriptmuster", "Ein eingebettetes Skript verändert Objekt-Prototypen. Ein Hygiene-Hinweis, keine Gefahr für dich."],
  },
  "dom-xss": {
    en: ["Risky script pattern", "An inline script writes address data into the page. Site hygiene, not a threat to you."],
    de: ["Riskantes Skriptmuster", "Ein eingebettetes Skript schreibt Adressdaten in die Seite. Ein Hygiene-Hinweis, keine Gefahr für dich."],
  },
  "prompt-injection": {
    en: ["Hidden instructions for AI", "Hidden text tells AI assistants to ignore their instructions. Do not let an AI agent act on this page."],
    de: ["Versteckte Anweisungen für KI", "Versteckter Text fordert KI-Assistenten auf, ihre Anweisungen zu ignorieren. Lass hier keinen KI-Agenten handeln."],
  },
  quishing: {
    en: ["QR code generator", "The page builds a QR code on the fly. Scan codes only from sources you trust."],
    de: ["QR-Code-Generator", "Die Seite erzeugt einen QR-Code. Scanne Codes nur aus vertrauenswürdigen Quellen."],
  },
  "miner-wasm": {
    en: ["Crypto miner", "The page runs code typical of in-browser crypto mining."],
    de: ["Krypto-Miner", "Die Seite führt Code aus, der typisch für Krypto-Mining im Browser ist."],
  },
  "fingerprint-canvas": {
    en: ["Canvas fingerprinting", "The page reads graphics output the way tracking scripts do."],
    de: ["Canvas-Fingerprinting", "Die Seite liest Grafikausgaben aus, wie es Tracking-Skripte tun."],
  },
  "fingerprint-audio": {
    en: ["Audio fingerprinting", "The page measures audio processing the way tracking scripts do."],
    de: ["Audio-Fingerprinting", "Die Seite misst die Audioverarbeitung, wie es Tracking-Skripte tun."],
  },
  "malvertising-chain": {
    en: ["Many ad frames", "Unusually many embedded ad frames. Known ad hosts are blocked."],
    de: ["Viele Werbe-Frames", "Ungewöhnlich viele eingebettete Werbe-Frames. Bekannte Werbehosts werden blockiert."],
  },
  "login-form": {
    en: ["Sign-in form", "Fundament checks who the page claims to be before you type."],
    de: ["Anmeldeformular", "Fundament prüft, wer die Seite vorgibt zu sein, bevor du etwas eingibst."],
  },
  "card-form": {
    en: ["Payment form", "Fundament checks the domain and hidden fields around it."],
    de: ["Zahlungsformular", "Fundament prüft die Domain und versteckte Felder im Formular."],
  },
  "browser-in-browser": {
    en: ["Fake login window", "This page draws a fake pop-up with a fake address bar. Real sign-in windows can be dragged outside the page. Do not type a password."],
    de: ["Gefälschtes Anmeldefenster", "Diese Seite zeichnet ein falsches Pop-up mit falscher Adressleiste. Echte Anmeldefenster lassen sich aus der Seite herausziehen. Kein Passwort eingeben."],
  },
  "tech-support-scam": {
    en: ["Tech-support scam", "Your computer is fine. Do not call the number and do not install remote-access software. Close this tab."],
    de: ["Fake-Support-Betrug", "Dein Computer ist in Ordnung. Ruf die Nummer nicht an und installiere keine Fernwartungs-Software. Schließ diesen Tab."],
  },
  "keyboard-lock": {
    en: ["Keyboard captured", "The page captured Esc and system keys. Hold Esc for two seconds to leave fullscreen."],
    de: ["Tastatur abgefangen", "Die Seite hat Esc und Systemtasten abgefangen. Halte Esc zwei Sekunden gedrückt, um das Vollbild zu verlassen."],
  },
  "hidden-autofill": {
    en: ["Hidden autofill fields", "Invisible fields would receive your card or address data if you use autofill. Type by hand here."],
    de: ["Versteckte Autofill-Felder", "Unsichtbare Felder würden beim automatischen Ausfüllen deine Karten- oder Adressdaten erhalten. Hier von Hand eintippen."],
  },
  "clipboard-hijack": {
    en: ["Address swap blocked", "The page tried to replace the wallet address you copied. Fundament kept yours. Check addresses before sending."],
    de: ["Adresstausch blockiert", "Die Seite wollte die kopierte Wallet-Adresse austauschen. Fundament hat deine behalten. Prüf Adressen vor dem Senden."],
  },
  "wallet-drainer": {
    en: ["Risky wallet request", "The page asked for an unlimited approval or a Permit signature. Drainers empty wallets this way. Reject unless you are sure."],
    de: ["Riskante Wallet-Anfrage", "Die Seite forderte eine unbegrenzte Freigabe oder Permit-Signatur. So leeren Drainer Wallets. Ablehnen, wenn du nicht sicher bist."],
  },
  "brand-content": {
    en: ["Page claims to be $1", "It says $1, but you are on $2, which does not belong to $1. Do not sign in or pay."],
    de: ["Seite gibt sich als $1 aus", "Die Seite nennt sich $1, du bist aber auf $2 – das gehört nicht zu $1. Nicht anmelden, nicht bezahlen."],
  },
  "combo-brand-credential": {
    en: ["Brand lookalike wants your login", "A page posing as a brand asks for a password, card, or key. That is the core of phishing."],
    de: ["Marken-Imitat will deine Zugangsdaten", "Eine Seite, die sich als Marke ausgibt, verlangt Passwort, Karte oder Schlüssel. Das ist der Kern von Phishing."],
  },
  "combo-hosted-credential": {
    en: ["Login form on free hosting", "Real banks, shops, and wallets never collect logins on free site builders."],
    de: ["Login-Formular auf Gratis-Hosting", "Echte Banken, Shops und Wallets sammeln nie Logins auf kostenlosen Website-Baukästen."],
  },
  "combo-brand-twice": {
    en: ["Address and page both fake a brand", "Both the domain and the page content claim a brand this site does not belong to."],
    de: ["Adresse und Seite imitieren eine Marke", "Domain und Seiteninhalt geben sich als Marke aus, zu der diese Seite nicht gehört."],
  },
  "blocked-feed": {
    en: ["Known phishing site", "On the phishing list shipped with Fundament. Stopped before it loaded."],
    de: ["Bekannte Phishing-Seite", "Steht auf der Phishing-Liste von Fundament. Gestoppt, bevor sie geladen wurde."],
  },
  "blocked-ioc": {
    en: ["On your threat feed", "Listed in the threat feed you set up. Stopped before it loaded."],
    de: ["In deinem Bedrohungs-Feed", "Steht in dem Bedrohungs-Feed, den du eingerichtet hast. Gestoppt, bevor sie geladen wurde."],
  },
  "blocked-threat": {
    en: ["Known malicious host", "On Fundament's list of wallet-drainer and credential-theft hosts."],
    de: ["Bekannter Schadhost", "Steht auf der Liste von Fundament mit Wallet-Drainer- und Datendieb-Hosts."],
  },
  "blocked-user": {
    en: ["On your blocklist", "You blocked this site yourself."],
    de: ["Auf deiner Sperrliste", "Du hast diese Seite selbst gesperrt."],
  },
};

export function fillTemplate(template: string, args: readonly string[] = []): string {
  return template.replace(/\$(\d)/g, (_all, n: string) => args[Number(n) - 1] ?? "");
}

export function signalCopy(key: string, args: readonly string[] = [], lang: SignalLang = "en"): { title: string; explanation: string } {
  const entry = SIGNAL_COPY[key];
  if (!entry) return { title: key, explanation: "" };
  const [title, explanation] = entry[lang] ?? entry.en;
  return { title: fillTemplate(title, args), explanation: fillTemplate(explanation, args) };
}

export function langFromLocale(locale: string | undefined): SignalLang {
  return /^de\b/i.test(locale ?? "") ? "de" : "en";
}

/** Text for any signal in the given language; old signals without a key keep their stored copy. */
export function localizeSignal(
  signal: { id: string; key?: string; args?: string[]; title: string; explanation: string },
  lang: SignalLang,
): { title: string; explanation: string } {
  const key = signal.key ?? signal.id;
  if (!SIGNAL_COPY[key]) return { title: signal.title, explanation: signal.explanation };
  return signalCopy(key, signal.args ?? [], lang);
}
