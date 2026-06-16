// catalogService.test.js — unit tests for the catalog service.
import { fetchCatalog } from '../../services/catalogService.js'

function makeResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: `Status ${status}`,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  global.fetch = vi.fn()
})

describe('fetchCatalog', () => {
  test('resolves with catalog data on 200', async () => {
    const data = [{ id: 'c1', slug: 'bocadillos', label: 'Bocadillos', products: [] }]
    global.fetch.mockReturnValue(makeResponse(200, data))
    const result = await fetchCatalog()
    expect(result).toEqual(data)
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/catalog'))
  })

  test('throws descriptive error on 500', async () => {
    global.fetch.mockReturnValue(makeResponse(500, {}))
    await expect(fetchCatalog()).rejects.toThrow('Failed to fetch catalog: 500')
  })

  test('throws descriptive error on 404', async () => {
    global.fetch.mockReturnValue(makeResponse(404, {}))
    await expect(fetchCatalog()).rejects.toThrow('Failed to fetch catalog: 404')
  })

  test('throws on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))
    await expect(fetchCatalog()).rejects.toThrow('Network error')
  })
})
