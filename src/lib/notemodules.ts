// The compiled MDX of each note. Lazy, so that a build compiles only the notes it lists. Kept apart from notes.ts because
// import.meta.glob exists only under Vite and the claims checker runs under tsx.
const modules = import.meta.glob<{ default: unknown }>(['/src/content/notes/*.mdx', '/tests/fixtures/notes/*.mdx']);

export async function noteContent(slug: string): Promise<any> {
  const dir = process.env.NOTES_FIXTURE ? '/tests/fixtures/notes/' : '/src/content/notes/';
  const load = modules[`${dir}${slug}.mdx`];
  if (!load) throw new Error(`no MDX file for note ${slug}`);
  return (await load()).default;
}
