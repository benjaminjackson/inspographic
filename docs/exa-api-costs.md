# Exa API Costs

## Influence Graph Generation

**Cost per person**: Approximately 4 API calls
- 1 call for subject + depth-1 influences
- 3 calls for depth-2 influences (limited to first 3 depth-1 nodes)

**Estimated cost**:
- Based on Exa pricing: ~$0.005 per neural search call
- Total per graph: ~$0.02 (4 calls × $0.005)

## Recorded Examples

- **Miles Davis**: 11 nodes, 10 links across 3 depth levels
- **Obscure person**: Gracefully returns 1 node, 0 links

## VCR Cassettes

To avoid API costs during development and testing, we use VCR recordings stored in `test/fixtures/vcr/`.

To re-record cassettes:
```bash
EXA_API_KEY=$EXA_PROD_API_KEY node scripts/record-vcr.js
```

## Usage in Production

The API key should be set in the environment:
```bash
EXA_API_KEY=your_key_here
```

Or will fall back to `EXA_PROD_API_KEY` if available.
