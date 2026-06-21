/**
 * Personas loader — YAML config with schema validation
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PERSONAS_DIR = join(__dirname, '../../personas')

const REQUIRED_FIELDS = ['name', 'role', 'system_prompt']
const VALID_ROLES = ['CISO', 'CEO', 'CFO', 'Tech Lead', 'User Advocate', 'Lawyer', 'CTO', 'COO', 'CHRO', 'Critic', 'Editor', 'Custom']

export function loadPersonas() {
  const personas = {}

  const files = readdirSync(PERSONAS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))

  if (files.length === 0) {
    throw new Error(`No persona files found in ${PERSONAS_DIR}. Expected YAML files.`)
  }

  for (const file of files) {
    const content = readFileSync(join(PERSONAS_DIR, file), 'utf8')
    const parsed = YAML.parse(content)

    if (!parsed) {
      throw new Error(`Invalid YAML in ${file}: empty or parse error`)
    }

    // Support both single persona and array
    const list = Array.isArray(parsed) ? parsed : [parsed]

    for (const persona of list) {
      // Validate required fields
      for (const field of REQUIRED_FIELDS) {
        if (!persona[field]) {
          throw new Error(`Persona in ${file} missing required field: ${field}`)
        }
      }

      // Validate role
      if (!VALID_ROLES.includes(persona.role) && !persona.role.startsWith('Custom:')) {
        throw new Error(`Invalid role "${persona.role}" in ${file}. Valid: ${VALID_ROLES.join(', ')}, or Custom:*`)
      }

      // Validate system_prompt is a string and not empty
      if (typeof persona.system_prompt !== 'string' || persona.system_prompt.trim().length < 20) {
        throw new Error(`Persona "${persona.name}" in ${file}: system_prompt must be >= 20 chars`)
      }

      // Defaults
      persona.temperature = persona.temperature ?? 0.7
      persona.model_override = persona.model_override || null

      const key = persona.role.toLowerCase().replace(/\s+/g, '_')
      personas[key] = persona
    }
  }

  return personas
}
