import type { Persona } from '../game/types';

interface PersonaManifest {
  files: string[];
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.text();
}

function extractPersonaName(markdown: string, fallback: string): string {
  const firstHeading = markdown.match(/^#\s+(.+)$/m);
  return firstHeading?.[1]?.trim() || fallback;
}

function fileToPersonaId(file: string): string {
  return file.replace(/\.md$/i, '');
}

export async function loadRulesMarkdown(): Promise<string> {
  return fetchText('/rules/werewolf-rules.md');
}

export async function loadPersonas(): Promise<Persona[]> {
  const manifestResponse = await fetch('/personas/index.json');
  if (!manifestResponse.ok) {
    throw new Error(`Failed to load /personas/index.json: ${manifestResponse.status}`);
  }

  const manifest = (await manifestResponse.json()) as PersonaManifest;
  return Promise.all(
    manifest.files.map(async (file) => {
      const markdown = await fetchText(`/personas/${file}`);
      return {
        id: fileToPersonaId(file),
        name: extractPersonaName(markdown, fileToPersonaId(file)),
        markdown,
      };
    }),
  );
}
