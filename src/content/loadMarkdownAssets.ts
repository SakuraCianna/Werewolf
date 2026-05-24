import type { Persona } from '../game/types';

interface PersonaManifest {
  files: string[];
}

const PERSONA_MANIFEST_PATH = '/personas/index.json';
const INVALID_PERSONA_MANIFEST_ERROR =
  'Invalid persona manifest /personas/index.json: expected files to be a non-empty string[] of .md files';

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

function parsePersonaManifest(manifest: unknown): PersonaManifest {
  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('files' in manifest) ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0 ||
    !manifest.files.every((file) => typeof file === 'string' && file.trim() !== '' && file.endsWith('.md'))
  ) {
    throw new Error(INVALID_PERSONA_MANIFEST_ERROR);
  }

  return { files: manifest.files };
}

export async function loadRulesMarkdown(): Promise<string> {
  return fetchText('/rules/werewolf-rules.md');
}

export async function loadPersonas(): Promise<Persona[]> {
  const manifestResponse = await fetch(PERSONA_MANIFEST_PATH);
  if (!manifestResponse.ok) {
    throw new Error(`Failed to load ${PERSONA_MANIFEST_PATH}: ${manifestResponse.status}`);
  }

  const manifest = parsePersonaManifest(await manifestResponse.json());
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
