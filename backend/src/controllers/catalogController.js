import { getCatalog } from '../services/catalogService.js'

export async function catalog(req, res, next) {
  try {
    const data = await getCatalog()
    res.json(data)
  } catch (err) {
    next(err)
  }
}
