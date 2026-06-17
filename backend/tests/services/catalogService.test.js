import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockCategory = {
  findMany: jest.fn(),
}

jest.unstable_mockModule('../../src/config/prisma.js', () => ({
  prisma: { category: mockCategory },
}))

const { getCatalog } = await import('../../src/services/catalogService.js')

beforeEach(() => {
  mockCategory.findMany.mockReset()
})

const sampleCategory = {
  id: 'cat-1',
  slug: 'bocadillos',
  label: 'Bocadillos',
  heading: 'Los mejores',
  sortOrder: 1,
  products: [
    {
      id: 'prod-1',
      name: 'Bocadillo de jamón',
      description: 'Con jamón ibérico',
      price: 5.50,
      available: true,
      sortOrder: 1,
      productAllergens: [
        { allergen: { name: 'Gluten', icon: '🌾' } },
      ],
      ingredients: [{ name: 'Jamón', sortOrder: 1 }],
      optionGroups: [
        {
          id: 'og-1',
          label: 'Pan',
          type: 'SINGLE',
          sortOrder: 1,
          optionChoices: [
            { id: 'oc-1', label: 'Integral', priceDelta: 0.5, available: true, sortOrder: 1 },
            { id: 'oc-2', label: 'Blanco', priceDelta: 0, available: true, sortOrder: 2 },
          ],
        },
      ],
    },
  ],
}

describe('getCatalog', () => {
  it('returns categories shaped correctly', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const result = await getCatalog()
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('bocadillos')
    expect(result[0].id).toBe('bocadillos') // slug is used as id
  })

  it('maps products with price as a number', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const result = await getCatalog()
    expect(result[0].products[0].price).toBe(5.5)
    expect(typeof result[0].products[0].price).toBe('number')
  })

  it('maps allergens to an array of names', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const result = await getCatalog()
    expect(result[0].products[0].allergens).toEqual(['Gluten'])
  })

  it('maps ingredients to an array of names', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const result = await getCatalog()
    expect(result[0].products[0].ingredients).toEqual(['Jamón'])
  })

  it('maps option groups with priceDelta as priceExtra', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const result = await getCatalog()
    const opts = result[0].products[0].options
    expect(opts).toHaveLength(1)
    expect(opts[0].choices[0].priceExtra).toBe(0.5)
    expect(opts[0].choices[1].priceExtra).toBe(0)
  })

  it('returns options as undefined for products with no option groups', async () => {
    const catNoOptions = {
      ...sampleCategory,
      products: [{ ...sampleCategory.products[0], optionGroups: [] }],
    }
    mockCategory.findMany.mockResolvedValue([catNoOptions])
    const result = await getCatalog()
    expect(result[0].products[0].options).toBeUndefined()
  })

  it('returns an empty array when no categories', async () => {
    mockCategory.findMany.mockResolvedValue([])
    const result = await getCatalog()
    expect(result).toEqual([])
  })

  it('uses label and heading from the category', async () => {
    mockCategory.findMany.mockResolvedValue([sampleCategory])
    const result = await getCatalog()
    expect(result[0].label).toBe('Bocadillos')
    expect(result[0].heading).toBe('Los mejores')
  })

  it('defaults empty description to empty string', async () => {
    const catNoDesc = {
      ...sampleCategory,
      products: [{ ...sampleCategory.products[0], description: null }],
    }
    mockCategory.findMany.mockResolvedValue([catNoDesc])
    const result = await getCatalog()
    expect(result[0].products[0].description).toBe('')
  })
})
