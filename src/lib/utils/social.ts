/** "https://instagram.com/casaherbert/" → "@casaherbert" (ou "/casaherbert" com prefix "/"). */
export function socialHandle(url: string, prefix = "@"): string {
  try {
    const first = new URL(url).pathname.split("/").filter(Boolean)[0];
    return first ? `${prefix}${first}` : url;
  } catch {
    return url;
  }
}
