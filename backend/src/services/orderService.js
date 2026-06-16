import { prisma } from '../config/prisma.js'
import { httpError } from '../utils/httpError.js'
import { normalizePhone } from './authService.js'
import { resolveAddressForOrder, buildAddressSnapshot } from './addressService.js'

/**
 * Checks the blacklist for the given phone, address, and email.
 * Throws 403 if a match is found.
 */
async function checkBlacklist(phone, addressStr, email) {
  const now = new Date()
  const conditions = []
  if (phone) conditions.push({ type: 'phone', value: phone })
  if (addressStr) conditions.push({ type: 'address', value: addressStr })
  if (email) conditions.push({ type: 'email', value: email })

  if (conditions.length === 0) return

  const match = await prisma.blacklist.findFirst({
    where: {
      OR: conditions,
      expiresAt: { gt: now },
    },
  })
  if (match) throw httpError(403, 'Order cannot be processed')
}

/**
 * Anti-fraud heuristics — returns a human-readable list of flags.
 * Flagged orders are forced into PENDING status for manual review.
 */
async function detectFraudFlags(phone, addressStr) {
  const flags = []
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // 1. Same phone + same address within 5 minutes
  if (phone && addressStr) {
    const rapid = await prisma.order.count({
      where: {
        contactPhone: phone,
        deliveryAddress: addressStr,
        createdAt: { gte: fiveMinutesAgo },
      },
    })
    if (rapid >= 2) flags.push('RAPID_REPEAT_SAME_ADDRESS')
  }

  // 2. Same phone: more than 2 orders in 24h
  if (phone) {
    const dailyCount = await prisma.order.count({
      where: {
        contactPhone: phone,
        createdAt: { gte: oneDayAgo },
      },
    })
    if (dailyCount >= 2) flags.push('PHONE_EXCEEDS_DAILY_LIMIT')
  }

  // 3. Same address: >= 3 different phones in 1h
  if (addressStr) {
    const recentOrders = await prisma.order.findMany({
      where: {
        deliveryAddress: addressStr,
        createdAt: { gte: oneHourAgo },
      },
      select: { contactPhone: true },
    })
    const uniquePhones = new Set(recentOrders.map((o) => o.contactPhone).filter(Boolean))
    if (uniquePhones.size >= 3) flags.push('MULTIPLE_PHONES_SAME_ADDRESS')
  }

  return flags
}

export async function createOrder(userId, data) {
  const {
    idempotencyKey,
    mode,
    paymentMethod,
    timing,
    scheduledFor,
    items,
    addressId,
    contactPhone,
    notes,
  } = data

  // 1. Idempotency — return existing order if key was seen in last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const existing = await prisma.order.findFirst({
    where: {
      idempotencyKey,
      createdAt: { gte: oneDayAgo },
    },
    include: { orderLines: true },
  })
  if (existing) return { order: existing, alreadyExisted: true }

  // 2. Fetch user for fraud and phone checks
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, phoneVerified: true, deletedAt: true },
  })
  if (!user || user.deletedAt) throw httpError(403, 'Account not found')

  // Normalize contact phone (must be valid Spanish number)
  const normalizedPhone = normalizePhone(contactPhone)

  // 3. Resolve delivery address (DELIVERY only)
  //    resolveAddressForOrder validates ownership and throws 400 if invalid.
  let resolvedAddress = null
  let addressStr = null
  if (mode === 'DELIVERY') {
    // addressId is guaranteed non-null here because the Zod schema already
    // enforced it for DELIVERY mode. Belt-and-suspenders check just in case.
    if (!addressId) throw httpError(400, 'addressId is required for DELIVERY orders')
    resolvedAddress = await resolveAddressForOrder(userId, addressId)
    addressStr = buildAddressSnapshot(resolvedAddress)
  }

  // 4. Blacklist check
  await checkBlacklist(normalizedPhone, addressStr, user.email)

  // 5. Server-side total recalculation — NEVER trust the client total
  let calculatedTotal = 0
  const resolvedLines = await Promise.all(
    items.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, price: true, available: true },
      })
      if (!product) throw httpError(422, `Product ${item.productId} not found`)
      if (!product.available) {
        throw httpError(422, `Product "${product.name}" is currently unavailable`)
      }

      // Calculate any option price delta (choices with priceDelta > 0)
      let priceDelta = 0
      if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
        const choiceIds = Object.values(item.selectedOptions)
        const choices = await prisma.optionChoice.findMany({
          where: { id: { in: choiceIds } },
          select: { id: true, label: true, priceDelta: true },
        })
        priceDelta = choices.reduce((sum, c) => sum + Number(c.priceDelta), 0)
      }

      const unitPrice = Number(product.price) + priceDelta
      const lineTotal = unitPrice * item.quantity
      calculatedTotal += lineTotal

      return { item, product, unitPrice, lineTotal }
    })
  )

  // 6. Fraud detection heuristics
  const fraudFlags = await detectFraudFlags(normalizedPhone, addressStr)

  // 7. All orders start PENDING — the admin manually confirms or cancels.
  // Auto-confirmation logic was explicitly removed per user decision (2026-06-14).
  // Fraud flags are attached so the admin can act on them.
  const status = 'PENDING'

  // 8. Create the order with all lines in a single transaction
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        status,
        mode,
        paymentMethod,
        timing: timing ?? 'ASAP',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        contactPhone: normalizedPhone,
        // Snapshot: immutable copy of the address text at order creation time.
        // Follows the same pattern as productNameSnapshot in OrderLine.
        deliveryAddress: addressStr,
        // Soft FK for traceability — survives address soft-delete.
        addressId: resolvedAddress ? resolvedAddress.id : null,
        total: calculatedTotal,
        idempotencyKey,
        notes: notes ?? null,
        orderLines: {
          create: resolvedLines.map(({ item, product, unitPrice, lineTotal }) => ({
            productId: product.id,
            productNameSnapshot: product.name,
            unitPriceSnapshot: unitPrice,
            quantity: item.quantity,
            lineTotal,
            selectedOptions: item.selectedOptions
              ? Object.entries(item.selectedOptions).map(([groupId, choiceId]) => ({
                  groupId,
                  choiceId,
                }))
              : null,
            removedIngredients: item.removedIngredients ?? [],
            notes: item.notes ?? null,
          })),
        },
      },
      include: { orderLines: true },
    })

    // Write the initial status history entry
    await tx.orderStatusHistory.create({
      data: {
        orderId: created.id,
        status: created.status,
        changedBy: null, // system-generated
        note: 'Order created',
      },
    })

    return created
  })

  return { order, alreadyExisted: false, fraudFlags }
}
