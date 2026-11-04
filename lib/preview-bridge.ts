// Document preview isolation (B29).
//
// Previews render store data that any store member can type (customer names,
// notes, product names, addresses). They used to run in iframes sandboxed with
// "allow-scripts allow-same-origin", which is effectively no sandbox: a script
// that slipped into the HTML could read the viewer's token from localStorage
// and act as that (possibly higher-privileged) user.
//
// Previews now run WITHOUT allow-same-origin (an opaque origin: no access to
// the app's storage, cookies or DOM). The parent never touches the frame's DOM;
// this bridge, injected into the preview HTML, talks to it by postMessage:
//   - after Paged.js finishes it posts { type: "pos-paged", pages, styles };
//   - it prints itself on { type: "pos-print" }.
// A CSP meta tag also blocks network exfiltration and form posts.

export const PREVIEW_SANDBOX_SCRIPTS = "allow-scripts allow-modals";

const CSP = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'">`;

const BRIDGE = `<script>(function(){
window.addEventListener("message",function(e){if(e.source===window.parent&&e.data&&e.data.type==="pos-print"){Promise.resolve(window.__posPagedReady).catch(function(){}).then(function(){window.focus();window.print();});}});
function send(m){try{window.parent.postMessage(m,"*");}catch(_){}}
window.addEventListener("load",function(){
  if(!window.__posPagedReady){send({type:"pos-paged-unavailable"});return;}
  window.__posPagedReady.then(function(){
    var pages=[].map.call(document.querySelectorAll(".pagedjs_page"),function(p){return p.outerHTML;});
    var styles=[].map.call(document.head.querySelectorAll("style, link[rel='stylesheet']"),function(n){return n.outerHTML;}).join("\\n");
    send({type:"pos-paged",pages:pages,styles:styles});
  },function(){send({type:"pos-paged-error"});});
});
})();</script>`;

/** Injects the CSP and the postMessage bridge into preview HTML. */
export function withPreviewBridge(html: string): string {
  let out = html;
  out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (m) => m + CSP) : CSP + out;
  out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, BRIDGE + "</body>") : out + BRIDGE;
  return out;
}

/** Asks a bridged preview frame to print itself (no same-origin access needed). */
export function printPreviewFrame(frame: HTMLIFrameElement | null) {
  frame?.contentWindow?.postMessage({ type: "pos-print" }, "*");
}
