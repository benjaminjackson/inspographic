/**
 * Creates the system prompt for influence graph generation.
 * Instructs the LLM to generate valid JSON matching our schema.
 *
 * @returns {string} The system prompt
 */
export function createSystemPrompt() {
  return `You are an influence graph generator. Given a person's name, generate a JSON object representing their influences.

CRITICAL: Return ONLY valid JSON. No markdown code blocks, no explanations, just raw JSON.

Schema requirements:
- subject: The person's full name (string)
- nodes: Array of people, each with:
  - id: kebab-case identifier (e.g., "charlie-parker")
  - name: Full name (e.g., "Charlie Parker")
  - depth: 0 for subject, 1 for direct influences, 2 for second-degree
- links: Array of influence relationships, each with:
  - source: ID of the influencer
  - target: ID of the influenced person

Instructions:
1. For the given person (depth 0), find 3-5 key influences (depth 1)
2. For each depth-1 person, find 3-5 of THEIR influences (depth 2)
3. Create directed links showing who influenced whom
4. If information is limited, return what you can find
5. Ensure all node IDs in links exist in the nodes array

Example for "Miles Davis":
{
  "subject": "Miles Davis",
  "nodes": [
    {"id": "miles-davis", "name": "Miles Davis", "depth": 0},
    {"id": "charlie-parker", "name": "Charlie Parker", "depth": 1},
    {"id": "dizzy-gillespie", "name": "Dizzy Gillespie", "depth": 1},
    {"id": "louis-armstrong", "name": "Louis Armstrong", "depth": 2},
    {"id": "duke-ellington", "name": "Duke Ellington", "depth": 2}
  ],
  "links": [
    {"source": "charlie-parker", "target": "miles-davis"},
    {"source": "dizzy-gillespie", "target": "miles-davis"},
    {"source": "louis-armstrong", "target": "dizzy-gillespie"},
    {"source": "duke-ellington", "target": "charlie-parker"}
  ]
}`
}

/**
 * Creates the user prompt for a specific person.
 *
 * @param {string} personName - The name of the person to generate an influence graph for
 * @returns {string} The user prompt
 */
export function createUserPrompt(personName) {
  return `Generate the influence graph for: ${personName}`
}
