import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '../schemas/influence-graph.schema.json');
const examplePath = join(__dirname, 'fixtures/example.json');
const invalidPath = join(__dirname, 'fixtures/invalid.json');

const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
const exampleData = JSON.parse(readFileSync(examplePath, 'utf-8'));
const invalidData = JSON.parse(readFileSync(invalidPath, 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(schema);

// Helper function to validate link integrity
function validateLinkIntegrity(data) {
  const nodeIds = new Set(data.nodes.map(n => n.id));
  const errors = [];

  for (const link of data.links) {
    if (!nodeIds.has(link.source)) {
      errors.push(`Link source "${link.source}" references non-existent node`);
    }
    if (!nodeIds.has(link.target)) {
      errors.push(`Link target "${link.target}" references non-existent node`);
    }
  }

  return errors;
}

describe('influence-graph schema', () => {
  it('validates example fixture', () => {
    const valid = validate(exampleData);
    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });

  it('rejects invalid fixture (missing subject)', () => {
    const valid = validate(invalidData);
    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
    expect(validate.errors[0].message).toContain("must have required property 'subject'");
  });

  it('validates link integrity', () => {
    // Example fixture should have valid links
    const exampleErrors = validateLinkIntegrity(exampleData);
    expect(exampleErrors).toHaveLength(0);

    // Test with broken link reference
    const brokenData = {
      subject: "Test",
      nodes: [{ id: "a", name: "A", depth: 0 }],
      links: [{ source: "a", target: "nonexistent" }]
    };
    const brokenErrors = validateLinkIntegrity(brokenData);
    expect(brokenErrors.length).toBeGreaterThan(0);
    expect(brokenErrors[0]).toContain('nonexistent');
  });
});
