import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { loadVCR } from '../helpers/vcr.js'

describe('API Proxy Server', () => {
  describe('Health check endpoint', () => {
    it('GET /api/health returns status ok', async () => {
      const app = (await import('../../server/apiProxy.js')).default

      const response = await request(app)
        .get('/api/health')
        .expect(200)
        .expect('Content-Type', /json/)

      expect(response.body).toEqual({ status: 'ok' })
    })

    it('GET /api/health includes CORS headers', async () => {
      const app = (await import('../../server/apiProxy.js')).default

      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })
  })

  describe('Influence graph endpoint', () => {
    it('POST /api/influence-graph returns 401 without Authorization header', async () => {
      const app = (await import('../../server/apiProxy.js')).default

      const response = await request(app)
        .post('/api/influence-graph')
        .send({ personName: 'Miles Davis' })
        .expect(401)

      expect(response.body.error).toBeDefined()
    })

    it('POST /api/influence-graph returns 400 without personName', async () => {
      // This test will fail because body validation doesn't exist yet (RED)
      const app = (await import('../../server/apiProxy.js')).default

      const response = await request(app)
        .post('/api/influence-graph')
        .set('Authorization', 'Bearer test-api-key')
        .send({})
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('POST /api/influence-graph returns 400 with empty personName', async () => {
      // This test will fail because body validation doesn't exist yet (RED)
      const app = (await import('../../server/apiProxy.js')).default

      const response = await request(app)
        .post('/api/influence-graph')
        .set('Authorization', 'Bearer test-api-key')
        .send({ personName: '' })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })
  })
})
