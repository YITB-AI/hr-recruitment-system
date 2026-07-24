// The generic /api/files/[...path] route serves straight off a randomUUID
// storage key (see lib/file-storage.ts) with no idea of a record's real
// display name — appending ?filename= is how a caller asks it to send back
// a human-meaningful Content-Disposition filename instead. Browsers use the
// response header's filename over an <a download="..."> attribute, so this
// query param (not just the anchor's `download` prop) is what actually
// controls the name the file lands under in the user's downloads folder.
export function withDownloadFilename(url: string, filename: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}filename=${encodeURIComponent(filename)}`;
}
