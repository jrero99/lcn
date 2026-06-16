import { prisma } from '../config/prisma.js'

/**
 * Returns the public catalog: active categories with available products.
 * Shape matches the frontend contract (see frontend/src/data/catalogMockData.js).
 *
 * Response shape per category:
 *   { id, slug, label, heading, products: [...] }
 *
 * Response shape per product:
 *   { id, name, description, price, allergens: string[], ingredients: string[], options?: [...] }
 */
export async function getCatalog() {
  const categories = await prisma.category.findMany({
    where: {},
    orderBy: { sortOrder: 'asc' },
    include: {
      products: {
        where: { available: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          productAllergens: {
            include: {
              allergen: { select: { name: true, icon: true } },
            },
          },
          optionGroups: {
            orderBy: { sortOrder: 'asc' },
            include: {
              optionChoices: {
                where: { available: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          ingredients: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  })

  return categories.map((cat) => ({
    id: cat.slug, // Use slug as the id (matches mock data shape)
    slug: cat.slug,
    label: cat.label,
    heading: cat.heading,
    products: cat.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      price: Number(p.price),
      allergens: p.productAllergens.map((pa) => pa.allergen.name),
      // Removable ingredients (rendered as checkboxes in ProductModal). The
      // frontend sends back the unchecked ones as `removedIngredients` per line.
      ingredients: p.ingredients.map((i) => i.name),
      options:
        p.optionGroups.length > 0
          ? p.optionGroups.map((og) => ({
              id: og.id,
              label: og.label,
              type: og.type,
              choices: og.optionChoices.map((c) => ({
                id: c.id,
                label: c.label,
                priceExtra: Number(c.priceDelta),
              })),
            }))
          : undefined,
    })),
  }))
}
