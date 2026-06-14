import { createOrderSchema } from '../validators/orders.js'
import { createOrder } from '../services/orderService.js'

export async function placeOrder(req, res, next) {
  try {
    const data = createOrderSchema.parse(req.body)
    const { order, alreadyExisted } = await createOrder(req.user.id, data)

    const httpStatus = alreadyExisted ? 200 : 201

    // Optional confirmation text consumed by the front-end Modal component.
    // All orders start in PENDING — the admin confirms manually.
    const confirmationTitle = alreadyExisted ? undefined : '¡Pedido recibido!'
    const confirmationMessage = alreadyExisted
      ? undefined
      : 'Hemos recibido tu pedido. El equipo de La Casa Nostra lo revisará en breve y te confirmará por teléfono.'

    res.status(httpStatus).json({
      orderId: order.id,
      status: order.status,
      total: Number(order.total),
      confirmationTitle,
      confirmationMessage,
    })
  } catch (err) {
    next(err)
  }
}
