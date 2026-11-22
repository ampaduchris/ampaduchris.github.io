import { loadNotes, buildFeed } from '../../lib/notes';
import { loadSite } from '../../lib/data';

// The feed exists only when a note does (REQ-071, REQ-075): with none, no path is listed and nothing is built.
export async function getStaticPaths() {
  return (await loadNotes()).length > 0 ? [{ params: { feed: 'feed' } }] : [];
}

export async function GET() {
  const xml = buildFeed(await loadNotes(), loadSite().url);
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
