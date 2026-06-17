import { prisma } from '../config/prisma.js'
import {
  updateOrderStatusSchema,
  listOrdersQuerySchema,
  createProductSchema,
  updateProductSchema,
  createBlacklistEntrySchema,
} from '../validators/admin.js'
import { httpError } from '../utils/httpError.js'

// ── ORDERS ──────────────────────────────────────────────────

export async function listOrders(req, res, next) {
  try {
    const { status, page: pageNum, limit: limitNum } = listOrdersQuerySchema.parse(req.query)
    const skip = (pageNum - 1) * limitNum

    const where = status ? { status } : {}

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          orderLines: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 5,
          },
        },
      }),
      prisma.order.count({ where }),
    ])

    res.json({
      data: orders.map((o) => ({
        id: o.id,
        status: o.status,
        mode: o.mode,
        timing: o.timing,
        paymentMethod: o.paymentMethod,
        total: Number(o.total),
        contactPhone: o.contactPhone,
        deliveryAddress: o.deliveryAddress,
        notes: o.notes,
        createdAt: o.createdAt,
        user: o.user
          ? {
              id: o.user.id,
              name: `${o.user.firstName} ${o.user.lastName}`,
              email: o.user.email,
              phone: o.user.phone,
            }
          : null,
        lines: o.orderLines.map((l) => ({
          id: l.id,
          productName: l.productNameSnapshot,
          unitPrice: Number(l.unitPriceSnapshot),
          quantity: l.quantity,
          lineTotal: Number(l.lineTotal),
          selectedOptions: l.selectedOptions,
          removedIngredients: l.removedIngredients,
          notes: l.notes,
        })),
        recentHistory: o.statusHistory,
      })),
      pagination: { page: pageNum, limit: limitNum, total },
    })
  } catch (err) {
    next(err)
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params
    const { status, note } = updateOrderStatusSchema.parse(req.body)

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status },
        select: { id: true, status: true, updatedAt: true },
      })

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          changedBy: req.user.id,
          note: note ?? null,
        },
      })

      return updated
    })

    res.json({ order })
  } catch (err) {
    if (err.code === 'P2025') return next(httpError(404, 'Order not found'))
    next(err)
  }
}

// ── CATALOG ─────────────────────────────────────────────────

export async function listAdminCatalog(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          include: {
            productAllergens: {
              include: { allergen: true },
            },
            optionGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                optionChoices: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    })
    res.json(categories)
  } catch (err) {
    next(err)
  }
}

export async function createProduct(req, res, next) {
  try {
    const data = createProductSchema.parse(req.body)
    const { allergenIds, ...productData } = data

    const product = await prisma.product.create({
      data: {
        ...productData,
        productAllergens: allergenIds
          ? {
              create: allergenIds.map((allergenId) => ({ allergenId })),
            }
          : undefined,
      },
      include: {
        productAllergens: { include: { allergen: true } },
        optionGroups: { include: { optionChoices: true } },
      },
    })

    res.status(201).json({ product })
  } catch (err) {
    next(err)
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params
    const data = updateProductSchema.parse(req.body)
    const { allergenIds, ...productData } = data

    const product = await prisma.product.update({
      where: { id },
      data: productData,
      include: {
        productAllergens: { include: { allergen: true } },
        optionGroups: { include: { optionChoices: true } },
      },
    })

    res.json({ product })
  } catch (err) {
    if (err.code === 'P2025') return next(httpError(404, 'Product not found'))
    next(err)
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params
    await prisma.product.delete({ where: { id } })
    res.status(204).end()
  } catch (err) {
    if (err.code === 'P2025') return next(httpError(404, 'Product not found'))
    next(err)
  }
}

// ── USERS ────────────────────────────────────────────────────

export async function listUsers(req, res, next) {
  try {
    const { page = '1', limit = '20' } = req.query
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const skip = (pageNum - 1) * limitNum

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null, role: 'CUSTOMER' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        // RGPD: minimum necessary fields only
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          phoneVerified: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where: { deletedAt: null, role: 'CUSTOMER' } }),
    ])

    res.json({
      data: users.map((u) => ({
        ...u,
        name: `${u.firstName} ${u.lastName}`,
      })),
      pagination: { page: pageNum, limit: limitNum, total },
    })
  } catch (err) {
    next(err)
  }
}

export async function getUserAddresses(req, res, next) {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!user) return next(httpError(404, 'User not found'))

    // NOTE: Address model is not in the approved schema yet.
    // Returning orders with deliveryAddress as a proxy until an Address model is added.
    const orders = await prisma.order.findMany({
      where: { userId: id, mode: 'DELIVERY', deliveryAddress: { not: null } },
      select: { id: true, deliveryAddress: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      distinct: ['deliveryAddress'],
    })

    res.json({ addresses: orders.map((o) => ({ orderId: o.id, address: o.deliveryAddress, lastUsed: o.createdAt }) )})
  } catch (err) {
    next(err)
  }
}

// ── BLACKLIST ────────────────────────────────────────────────

export async function listBlacklist(req, res, next) {
  try {
    const entries = await prisma.blacklist.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json({ data: entries })
  } catch (err) {
    next(err)
  }
}

export async function createBlacklistEntry(req, res, next) {
  try {
    const data = createBlacklistEntrySchema.parse(req.body)

    // Default expiry: 1 year from now (RGPD max retention)
    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

    const entry = await prisma.blacklist.create({
      data: {
        type: data.type,
        value: data.value,
        reason: data.reason,
        expiresAt,
      },
    })

    res.status(201).json({ entry })
  } catch (err) {
    next(err)
  }
}

export async function deleteBlacklistEntry(req, res, next) {
  try {
    const { id } = req.params
    await prisma.blacklist.delete({ where: { id } })
    res.status(204).end()
  } catch (err) {
    if (err.code === 'P2025') return next(httpError(404, 'Entry not found'))
    next(err)
  }
}
