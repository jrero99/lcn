// staticCatalog.js — read-only copy of the catalog for the public static site.
//
// Used by fetchCatalog() when orders are disabled (no backend available).
// Same shape as GET /api/catalog (see backend/src/services/catalogService.js):
//   category: { id, slug, label, heading, products[] }
//   product:  { id, name, description, price, allergens: string[], ingredients: string[] }
//
// SOURCE OF TRUTH: backend/prisma/seedCatalog.js. If the menu changes there,
// update this file too (and vice versa).
//
// !!! LEGAL WARNING — the allergens below were INFERRED from the menu
// descriptions and have NOT been validated by the business. They MUST be
// reviewed before going public (EU Regulation 1169/2011, art. 21).

function category(slug, label, heading, products) {
  return {
    id: slug,
    slug,
    label,
    heading,
    products: products.map(([name, description, price, allergens], i) => ({
      id: `${slug}-${i}`,
      name,
      description: description ?? '',
      price,
      allergens,
      ingredients: [],
    })),
  }
}

export const STATIC_CATALOG = [
  category('classics', 'Clásicos', '¡LOS CLÁSICOS QUE SÍ O SÍ NO PUEDEN FALTAR!', [
    ['Kiki', 'Pollo y salsa verde', 6.75, ['gluten']],
    ['Kiriko', 'Pollo, bacon, queso', 7.95, ['gluten', 'lacteos']],
    ['Kiki guay "colorao"', 'Pollo, pimiento rojo y salsa verde', 7.95, ['gluten']],
    ['Kiki guay "verde"', 'Pollo, pimiento verde y salsa verde', 7.95, ['gluten']],
    ['Super kiki', 'Pollo rebozado y lechuga', 7.95, ['gluten']],
    ['Lomo', null, 6.75, ['gluten']],
    ['Lomo con queso', null, 7.5, ['gluten', 'lacteos']],
    ['Lomo La Casa Nostra', 'Lomo, queso, champiñones y orégano', 7.95, ['gluten', 'lacteos']],
    ['Pinchos', null, 7.5, ['gluten']],
    ['Floren P.', 'Calamares y alioli', 7.5, ['gluten', 'huevos', 'moluscos']],
    ['Frankfurt', null, 3.95, ['gluten']],
    ['Cervela pequeña', null, 4.5, ['gluten']],
    ['Cervela 190gr', null, 6.95, ['gluten']],
    ['Bratwurst', null, 4.5, ['gluten']],
    ['Pikantwurst', null, 4.5, ['gluten']],
    ['Hamburguesa', null, 4.5, ['gluten']],
    ['Malagueña', null, 4.5, ['gluten']],
    ['Bacon', null, 6.5, ['gluten']],
    ['Bacon con queso', null, 6.95, ['gluten', 'lacteos']],
    ['Bacon La Casa Nostra', 'Bacon, queso, cebolla La Casa Nostra y huevo frito', 7.95, ['gluten', 'lacteos', 'huevos']],
  ]),

  category('tapas', 'Tapas', 'TAPAS PARA COMPARTIR O COMER SOLO/A', [
    ['Fritas 1/2 ración', null, 3.95, []],
    ['Fritas', null, 5.5, []],
    ['Bravas 1/2 ración', null, 4.5, ['huevos']],
    ['Bravas', null, 6.5, ['huevos']],
    ['Croquetas (8 uds.)', null, 7.95, ['gluten', 'lacteos', 'huevos']],
    ['Tequeños (6 uds.)', null, 7.95, ['gluten', 'lacteos']],
    ['Fingers La Casa Nostra', null, 7.95, ['gluten', 'huevos']],
    ['Guacamole La Casa Nostra', null, 7.95, []],
    ['Huevos rotos con jamón', null, 13, ['huevos']],
    ['Hummus La Casa Nostra', null, 7.95, ['sesamo']],
  ]),

  category('salads', 'Ensaladas', 'ENSALADAS FRESCAS Y GENEROSAS', [
    ['La Albuquerque', 'Lechuga, tomate, aguacate, bacon, cebolla frita y mostaza dulce', 7.2, ['mostaza']],
    ['La Marbella', 'Lechuga, rúcula, escalivada, anchoas, olivada y alcaparras', 7.95, ['pescado']],
    ['La New Jersey', 'Arroz, cherry, aguacate, rábano, manzana y salsa tártara', 7.2, ['huevos']],
    ['La Nápoles', 'Quinoa, rúcula, parmesano, tomates cherry con aceite de albahaca', 7.2, ['lacteos']],
    ['La Roma', 'Lechuga, pollo, bacon, parmesano, huevo y salsa césar', 7.2, ['lacteos', 'huevos', 'pescado']],
    ['La Sicilia', 'Lechuga, espinaca y rúcula, cherry, manzana, anacardos y pesto rosso', 7.2, ['frutos-de-cascara']],
  ]),

  category('burgers', 'Hamburguesas', 'NUESTRAS HAMBURGUESAS ARTESANAS', [
    ['Frank Costello', 'Hamburguesa, lechuga, tomate, pepinillo, bacon, queso, salsa tártara', 9.95, ['gluten', 'lacteos', 'huevos']],
    ['Sonny', 'Hamburguesa, foie, cebolla La Casa Nostra y mermelada de tomate', 9.95, ['gluten', 'lacteos']],
    ['Sr. Blanco', 'Hamburguesa, queso de cabra, trigueros, cebolla La Casa Nostra y salsa mostaza dulce', 10.95, ['gluten', 'lacteos', 'mostaza']],
    ['Frank Lucas', 'Hamburguesa, queso, champiñones, cebolla La Casa Nostra, rúcula y salsa romesco', 10.95, ['gluten', 'lacteos', 'frutos-de-cascara']],
    ['Tony Montana', 'Hamburguesa, lechuga, tomate, bacon, queso, cebolla crujiente, salsa BBQ', 9.95, ['gluten', 'lacteos']],
    ['Frank Sinatra', 'Hamburguesa, lechuga, nueces y salsa roquefort', 9.95, ['gluten', 'lacteos', 'frutos-de-cascara']],
    ['Mickey Cohen', 'Hamburguesa, lechuga, tomate, pepinillo, bacon, queso, cebolla La Casa Nostra y huevo frito', 10.95, ['gluten', 'lacteos', 'huevos']],
    ['Saul Goodman', 'Hamburguesa de pollo crujiente, bacon, queso y lechuga', 9.95, ['gluten', 'lacteos']],
    ['Hamburguesa "La Casa Nostra"', 'Hamburguesa, hoja de espinaca, bacon, queso, salsa pesto rosso y anacardos', 9.95, ['gluten', 'lacteos', 'frutos-de-cascara']],
  ]),

  category('vegetarians', 'Vegetarianos', 'OPCIONES VEGETARIANAS CON TODO EL SABOR', [
    ['Heisenberg', 'Escalivada, champiñones y olivada', 7.5, ['gluten']],
    ['Huerta Brava', 'Hamburguesa vegana, hoja de espinaca fresca, queso, alcachofa a la plancha y salsa romesco', 10.95, ['gluten', 'lacteos', 'frutos-de-cascara']],
    ['Dolce Vita', 'Hamburguesa vegana, queso, calabacín a la plancha, cebolla La Casa Nostra y pesto rosso', 9.95, ['gluten', 'lacteos', 'frutos-de-cascara']],
    ['Tony el gordo', 'Pisto, trigueros y queso de cabra', 7.95, ['gluten', 'lacteos']],
    ['Tony Soprano', 'Guacamole, cebolla La Casa Nostra, lechuga, tomate y huevo frito', 7.5, ['gluten', 'huevos']],
  ]),

  category('chicken', 'Pollos', 'POLLO TIERNO Y CRUJIENTE COMO NINGÚN OTRO', [
    ['Al Capone', 'Pollo, queso, huevo frito y salsa verde', 7.95, ['gluten', 'lacteos', 'huevos']],
    ['Billy el Carnicero', 'Pollo, cebolla La Casa Nostra, champiñones y romesco', 8.25, ['gluten', 'frutos-de-cascara']],
    ['Jimmy Conway', 'Pollo, rúcula, tomate, parmesano y aceite de albahaca', 8.25, ['gluten', 'lacteos']],
    ['Noodles Aaronson', 'Pollo, pisto y queso de cabra', 8.95, ['gluten', 'lacteos']],
    ['Paul Vitti', 'Pollo, lechuga, tomate, huevo duro, alioli', 7.5, ['gluten', 'huevos']],
    ['Sam "Ace" Rothstein', 'Pollo, salsa curry, manzana', 7.95, ['gluten']],
  ]),

  category('sandwiches', 'Sándwiches', 'SÁNDWICHES PARA TODOS LOS GUSTOS', [
    ['El Bikini de toda la vida', null, 3.95, ['gluten', 'lacteos']],
    ['Carlo Gambino', 'Pollo rebozado, bacon, queso, lechuga y salsa tártara', 7.5, ['gluten', 'lacteos', 'huevos']],
    ['Joseph Bonanno', 'Jamón dulce, queso y huevo frito', 6.5, ['gluten', 'lacteos', 'huevos']],
    ['Lucky Luciano', 'Pollo, espinaca fresca, queso, huevo frito y alioli', 7.5, ['gluten', 'lacteos', 'huevos']],
  ]),

  category('american', 'Americanos', 'EL ESTILO AMERICANO QUE NOS ENCANTA', [
    ['Christopher Moltisanti', 'Frankfurt, bacon, queso y huevo frito', 8.5, ['gluten', 'lacteos', 'huevos']],
    ['Donnie Brasco', 'Frankfurt, pepinillo, cebolla crujiente, kétchup y mostaza dulce', 7.5, ['gluten', 'mostaza']],
  ]),

  category('pork-loin', 'Solomillo de cerdo', 'SOLOMILLO DE CERDO: TERNURA EN CADA BOCADO', [
    ['Don Vito', 'Solomillo de cerdo, pisto y trigueros', 8.95, ['gluten']],
    ['Michael', 'Solomillo de cerdo, cebolla La Casa Nostra y reducción de oporto', 8.25, ['gluten', 'sulfitos']],
  ]),

  category('loins', 'Lomos', 'LOMOS HECHOS CON EL MEJOR PRODUCTO', [
    ['Jules', 'Lomo, jamón serrano, pimiento verde y lechuga', 8.25, ['gluten']],
    ['Vincent Vega', 'Lomo, queso, rúcula y pesto rosso', 8.25, ['gluten', 'lacteos', 'frutos-de-cascara']],
    ['Marcellus Wallace', 'Lomo, bacon, queso, lechuga y tomate', 8.25, ['gluten', 'lacteos']],
  ]),

  category('combos', 'Platos combinados', 'PLATOS COMBINADOS QUE LO LLEVAN TODO', [
    ['Combinado 1', 'Patatas, huevo frito, pollo a la plancha y pimientos del padrón', 12.95, ['huevos']],
    ['Combinado 2', 'Patatas, huevo frito, hamburguesa de ternera y pimientos del padrón', 12.95, ['gluten', 'huevos']],
    ['Combinado 3', 'Patatas, huevo frito, lomo y pimientos del padrón', 12.95, ['huevos']],
    ['Combinado 4', 'Patatas, huevo frito, pollo rebozado y pimientos del padrón', 12.95, ['gluten', 'huevos']],
    ['Combinado 5', 'Patatas, huevo frito, calamares a la romana y pimientos del padrón', 12.95, ['gluten', 'huevos', 'moluscos']],
    ['Combinado 6', 'Patatas al caliu, solomillo al oporto, pisto y pimientos del padrón', 12.95, ['sulfitos']],
    ['Combinado 7', 'Patatas al caliu, hamburguesa vegana, pisto y pimientos del padrón', 12.95, []],
    ['Combinado 8', 'Patatas fritas, huevo frito, tequeños y pimientos del padrón', 12.95, ['gluten', 'lacteos', 'huevos']],
    ['Combinado 9', 'Patatas fritas, huevo frito, pinchos y pimientos del padrón', 12.95, ['gluten', 'huevos']],
    ['Combinado 10', 'Patatas al caliu, escalivada, calabacín, champiñones, pimientos del padrón y salsa romesco', 12.95, ['frutos-de-cascara']],
  ]),

  category('desserts', 'Postres', 'POSTRES PARA REDONDEAR LA COMIDA', [
    ['Coulant', null, 6.5, ['gluten', 'huevos', 'lacteos']],
    ['Vasito de red velvet', null, 6.5, ['gluten', 'huevos', 'lacteos']],
    ['Cheese cake', null, 6.5, ['gluten', 'huevos', 'lacteos']],
    ['Vasito de brownie', null, 6.5, ['gluten', 'huevos', 'lacteos']],
    ['Vasito de carrot cake', null, 6.5, ['gluten', 'huevos', 'lacteos']],
  ]),
]
