// Mock data for the order catalog.
// TODO: Replace with real API call to GET /api/catalog (backend endpoint not yet defined).
// Each product has an optional `allergens` array (EU legal requirement for food menus).
//
// Products may also have an optional `options` field — an array of option groups
// rendered as radio groups in the product detail modal.
// TODO (backend-node): the real GET /api/catalog response must include `options` per
// product when applicable. Shape:
//   options: Array<{
//     id: string,
//     label: string,          // group heading shown in the modal
//     type: 'single',         // only 'single' (radio) supported for now
//     choices: Array<{ id: string, label: string }>
//   }>
//
// Products may also have an optional `ingredients` field — a flat list of the
// product's removable ingredients. The modal renders them as checkboxes (all
// checked by default) so the customer can remove the ones they don't want.
//   ingredients: string[]
// TODO (backend-node): GET /api/catalog should include `ingredients` per product
// when applicable, and POST /api/orders must accept, per order line:
//   - selectedOptions: { [groupId]: choiceId }
//   - removedIngredients: string[]
//   - notes: string   // free-text customer specification
//
// The mock options/ingredients below are representative examples for burgers only.
// All other categories have no options (simple add-to-cart, no customisation).

// Shared option groups reused across all burgers (mock data only)
const BURGER_OPTIONS = [
  {
    id: 'side',
    label: 'Elige tu acompañante',
    type: 'single',
    choices: [
      { id: 'bravas', label: 'Bravas' },
      { id: 'fries', label: 'Fritas' },
    ],
  },
  {
    id: 'sauce',
    label: 'Elige tu salsa',
    type: 'single',
    choices: [
      { id: 'brava', label: 'Brava' },
      { id: 'alioli', label: 'Alioli' },
      { id: 'bbq', label: 'BBQ' },
      { id: 'caesar', label: 'César' },
      { id: 'honey-mustard', label: 'Mostaza y miel' },
      { id: 'none', label: 'Sin salsa' },
    ],
  },
]

export const CATEGORIES = [
  {
    id: 'classics',
    label: 'Clásicos',
    heading: '¡LOS CLÁSICOS QUE SÍ O SÍ NO PUEDEN FALTAR!',
    products: [
      {
        id: 'c1',
        name: 'El de toda la vida',
        description: 'Pan artesano, jamón ibérico, tomate de temporada y aceite de oliva virgen extra.',
        price: 5.50,
        allergens: ['gluten'],
      },
      {
        id: 'c2',
        name: 'La Casa Nostra',
        description: 'Lomo de cerdo, pimiento rojo asado, queso curado y mayonesa de la casa.',
        price: 6.25,
        allergens: ['gluten', 'lácteos', 'huevos'],
      },
      {
        id: 'c3',
        name: 'El amigo del barrio',
        description: 'Tortilla francesa, queso fundido, tomate y un toque de orégano.',
        price: 4.75,
        allergens: ['gluten', 'huevos', 'lácteos'],
      },
      {
        id: 'c4',
        name: 'El Mataroní',
        description: 'Butifarra de Mataró a la plancha, pan tostado, escalivada y alioli.',
        price: 6.75,
        allergens: ['gluten'],
      },
      {
        id: 'c5',
        name: 'El Clásico Deluxe',
        description: 'Fuet del país, queso brie, miel de flores y nueces. Servido frío.',
        price: 7.00,
        allergens: ['gluten', 'lácteos', 'frutos secos'],
      },
    ],
  },
  {
    id: 'tapas',
    label: 'Tapas',
    heading: 'TAPAS PARA COMPARTIR O COMER SOLO/A',
    products: [
      {
        id: 't1',
        name: 'Patatas bravas',
        description: 'Patatas fritas crujientes con salsa brava picante y alioli.',
        price: 4.00,
        allergens: ['huevos'],
      },
      {
        id: 't2',
        name: 'Croquetas de la abuela',
        description: 'Croquetas caseras de jamón ibérico, cremosas por dentro y crujientes por fuera.',
        price: 5.50,
        allergens: ['gluten', 'lácteos', 'huevos'],
      },
      {
        id: 't3',
        name: 'Pimientos de Padrón',
        description: 'Pimientos de Padrón fritos con sal gruesa. ¡Algunos pican, la mayoría no!',
        price: 4.50,
        allergens: [],
      },
      {
        id: 't4',
        name: 'Pan con tomate',
        description: 'Pan tostado con tomate rallado fresco, sal y aceite de oliva virgen.',
        price: 2.50,
        allergens: ['gluten'],
      },
    ],
  },
  {
    id: 'burgers',
    label: 'Hamburguesas',
    heading: 'NUESTRAS HAMBURGUESAS ARTESANAS',
    products: [
      {
        id: 'b1',
        name: 'La Clásica',
        description: 'Carne de ternera, queso cheddar, lechuga, tomate y salsa de la casa.',
        price: 8.50,
        allergens: ['gluten', 'lácteos', 'huevos', 'sésamo'],
        ingredients: ['Carne de ternera', 'Queso cheddar', 'Lechuga', 'Tomate', 'Salsa de la casa'],
        // TODO: mock options — will come from GET /api/catalog (coordinate with backend-node)
        options: BURGER_OPTIONS,
      },
      {
        id: 'b2',
        name: 'La Picante',
        description: 'Carne de ternera, jalapeños, cheddar ahumado, cebolla caramelizada y salsa sriracha.',
        price: 9.00,
        allergens: ['gluten', 'lácteos'],
        ingredients: ['Carne de ternera', 'Jalapeños', 'Cheddar ahumado', 'Cebolla caramelizada', 'Salsa sriracha'],
        // TODO: mock options — will come from GET /api/catalog (coordinate with backend-node)
        options: BURGER_OPTIONS,
      },
      {
        id: 'b3',
        name: 'La Doble',
        description: 'Dos hamburguesas de ternera, doble cheddar, bacon crujiente y todos los acompañamientos.',
        price: 11.50,
        allergens: ['gluten', 'lácteos', 'sésamo'],
        ingredients: ['Doble carne de ternera', 'Doble cheddar', 'Bacon crujiente', 'Lechuga', 'Tomate', 'Cebolla', 'Salsa de la casa'],
        // TODO: mock options — will come from GET /api/catalog (coordinate with backend-node)
        options: BURGER_OPTIONS,
      },
      {
        id: 'b4',
        name: 'La Ahumada',
        description: 'Carne de ternera, bacon ahumado, salsa BBQ y cebolla frita crujiente.',
        price: 9.50,
        allergens: ['gluten', 'lácteos', 'soja'],
        ingredients: ['Carne de ternera', 'Bacon ahumado', 'Salsa BBQ', 'Cebolla frita crujiente'],
        // TODO: mock options — will come from GET /api/catalog (coordinate with backend-node)
        options: BURGER_OPTIONS,
      },
    ],
  },
  {
    id: 'vegetarians',
    label: 'Vegetarianas',
    heading: 'OPCIONES VEGETARIANAS CON TODO EL SABOR',
    products: [
      {
        id: 'v1',
        name: 'La Verde',
        description: 'Hamburguesa vegana, queso vegano, calabacín a la plancha, cebolla La Casa Nostra y pesto rosso.',
        price: 6.25,
        allergens: ['gluten', 'frutos secos'],
      },
      {
        id: 'v2',
        name: 'El Labrador',
        description: 'Queso de cabra, tomate seco, espinacas baby, nueces y vinagreta de miel.',
        price: 6.75,
        allergens: ['gluten', 'lácteos', 'frutos secos'],
      },
      {
        id: 'v3',
        name: 'La Mediterránea',
        description: 'Mozzarella fresca, tomate maduro, berenjena a la plancha, albahaca y tapenade.',
        price: 7.00,
        allergens: ['gluten', 'lácteos'],
      },
    ],
  },
  {
    id: 'chicken',
    label: 'Pollos',
    heading: 'POLLO TIERNO Y CRUJIENTE COMO NINGÚN OTRO',
    products: [
      {
        id: 'ch1',
        name: 'El Crispy',
        description: 'Pollo rebozado en aceite de oliva, lechuga, tomate y mayonesa de limón.',
        price: 7.25,
        allergens: ['gluten', 'huevos'],
      },
      {
        id: 'ch2',
        name: 'El Tennessee',
        description: 'Pollo crujiente picante al estilo del sur, con salsa de miel y mostaza.',
        price: 7.75,
        allergens: ['gluten', 'huevos', 'mostaza'],
      },
      {
        id: 'ch3',
        name: 'El Pesto',
        description: 'Pechuga de pollo a la plancha, pesto genovés, rúcula, tomate cherry y parmesano.',
        price: 7.50,
        allergens: ['gluten', 'lácteos', 'frutos secos'],
      },
    ],
  },
  {
    id: 'sandwiches',
    label: 'Sándwiches',
    heading: 'SÁNDWICHES PARA TODOS LOS GUSTOS',
    products: [
      {
        id: 's1',
        name: 'El Club',
        description: 'Pan de molde tostado, pollo, bacon, tomate, lechuga y mayonesa.',
        price: 6.50,
        allergens: ['gluten', 'huevos'],
      },
      {
        id: 's2',
        name: 'El Caprese',
        description: 'Pan ciabatta, mozzarella fresca, tomate, albahaca y reducción de balsámico.',
        price: 5.75,
        allergens: ['gluten', 'lácteos'],
      },
      {
        id: 's3',
        name: 'El Toscano',
        description: 'Pan de higo, gorgonzola, pera, nueces y miel de acacia. Sabor único.',
        price: 7.25,
        allergens: ['gluten', 'lácteos', 'frutos secos'],
      },
    ],
  },
  {
    id: 'american',
    label: 'Americanas',
    heading: 'EL ESTILO AMERICANO QUE NOS ENCANTA',
    products: [
      {
        id: 'am1',
        name: 'El Pulled Pork',
        description: 'Cerdo desmechado cocinado a fuego lento, coleslaw de col, pepinillos y salsa BBQ ahumada.',
        price: 8.75,
        allergens: ['gluten', 'huevos', 'mostaza'],
      },
      {
        id: 'am2',
        name: 'El Philly Cheesesteak',
        description: 'Tiras de ternera, pimiento verde, cebolla y queso provolone fundido.',
        price: 9.25,
        allergens: ['gluten', 'lácteos'],
      },
      {
        id: 'am3',
        name: 'El Texas Toast',
        description: 'Pan brioche grueso, bacon Hickory, huevos fritos y queso americano.',
        price: 8.00,
        allergens: ['gluten', 'lácteos', 'huevos'],
      },
    ],
  },
  {
    id: 'pork-loin',
    label: 'Solomillo de cerdo',
    heading: 'SOLOMILLO DE CERDO: TERNURA EN CADA BOCADO',
    products: [
      {
        id: 'sl1',
        name: 'Solomillo clásico',
        description: 'Solomillo de cerdo a la plancha, mayonesa de la casa, lechuga y tomate.',
        price: 7.50,
        allergens: ['gluten', 'huevos'],
      },
      {
        id: 'sl2',
        name: 'Solomillo con queso',
        description: 'Solomillo de cerdo, queso brie fundido, mermelada de higo y rúcula.',
        price: 8.25,
        allergens: ['gluten', 'lácteos'],
      },
      {
        id: 'sl3',
        name: 'Solomillo al Pedro Ximénez',
        description: 'Solomillo flameado con reducción de PX, cebolla caramelizada y pan de nueces.',
        price: 9.00,
        allergens: ['gluten', 'frutos secos'],
      },
    ],
  },
  {
    id: 'loins',
    label: 'Lomos',
    heading: 'LOMOS HECHOS CON EL MEJOR PRODUCTO',
    products: [
      {
        id: 'll1',
        name: 'Lomo a lo bestia',
        description: 'Lomo de cerdo con pimiento verde y rojo, cebolla frita y salsa de la casa.',
        price: 6.75,
        allergens: ['gluten'],
      },
      {
        id: 'll2',
        name: 'Lomo con tomate',
        description: 'Lomo a la plancha, tomate natural, queso fresco y orégano.',
        price: 6.50,
        allergens: ['gluten', 'lácteos'],
      },
      {
        id: 'll3',
        name: 'Lomo con trufa',
        description: 'Lomo de cerdo ibérico, crema de trufa, queso de oveja y rúcula.',
        price: 8.50,
        allergens: ['gluten', 'lácteos'],
      },
    ],
  },
  {
    id: 'salads',
    label: 'Ensaladas',
    heading: 'ENSALADAS FRESCAS Y GENEROSAS',
    products: [
      {
        id: 'sa1',
        name: 'Ensalada de la casa',
        description: 'Mezcla de verdes, tomate cherry, cebolla morada, aceitunas y vinagreta de mostaza.',
        price: 5.50,
        allergens: ['mostaza'],
      },
      {
        id: 'sa2',
        name: 'César',
        description: 'Lechuga romana, pechuga de pollo, picatostes, parmesano y salsa César.',
        price: 7.25,
        allergens: ['gluten', 'lácteos', 'huevos', 'pescado'],
      },
      {
        id: 'sa3',
        name: 'Nizarda',
        description: 'Atún, huevos cocidos, tomate, aceitunas negras, judías verdes y anchoas.',
        price: 8.00,
        allergens: ['huevos', 'pescado'],
      },
    ],
  },
  {
    id: 'combos',
    label: 'Platos combinados',
    heading: 'PLATOS COMBINADOS QUE LO LLEVAN TODO',
    products: [
      {
        id: 'pc1',
        name: 'Combinado del día',
        description: 'Bocadillo de la casa + patatas bravas + bebida. El mejor precio del menú.',
        price: 9.50,
        allergens: ['gluten', 'huevos'],
      },
      {
        id: 'pc2',
        name: 'Menú Clásico',
        description: 'Bocadillo de jamón + croquetas (3 unidades) + bebida.',
        price: 10.75,
        allergens: ['gluten', 'lácteos', 'huevos'],
      },
      {
        id: 'pc3',
        name: 'Menú Veggie',
        description: 'Bocadillo vegetariano + ensalada + bebida. Ligero y satisfactorio.',
        price: 10.00,
        allergens: ['gluten', 'lácteos'],
      },
    ],
  },
  {
    id: 'desserts',
    label: 'Postres',
    heading: 'POSTRES PARA REDONDEAR LA COMIDA',
    products: [
      {
        id: 'd1',
        name: 'Crema catalana',
        description: 'Receta tradicional catalana con azúcar quemado al momento. Casera.',
        price: 4.00,
        allergens: ['lácteos', 'huevos'],
      },
      {
        id: 'd2',
        name: 'Brownie de chocolate',
        description: 'Brownie casero de chocolate 70%, caliente, con helado de vainilla.',
        price: 5.25,
        allergens: ['gluten', 'lácteos', 'huevos'],
      },
      {
        id: 'd3',
        name: 'Tiramisú',
        description: 'Tiramisú clásico: mascarpone, café, amaretto y cacao amargo.',
        price: 5.00,
        allergens: ['lácteos', 'huevos', 'gluten'],
      },
      {
        id: 'd4',
        name: 'Fruta fresca',
        description: 'Selección de fruta de temporada cortada y lista para comer.',
        price: 3.00,
        allergens: [],
      },
    ],
  },
  {
    id: 'drinks',
    label: 'Bebidas',
    heading: 'BEBIDAS PARA ACOMPAÑAR',
    products: [
      {
        id: 'dr1',
        name: 'Coca-Cola',
        description: 'Lata de 33 cl, muy fría.',
        price: 2.25,
        allergens: [],
      },
      {
        id: 'dr2',
        name: 'Agua mineral',
        description: 'Botella de 50 cl. Con gas o sin gas, a elegir.',
        price: 1.75,
        allergens: [],
      },
      {
        id: 'dr3',
        name: 'Cerveza',
        description: 'Caña o botella de 33 cl. Con o sin alcohol.',
        price: 2.50,
        allergens: ['gluten'],
      },
      {
        id: 'dr4',
        name: 'Zumo de naranja natural',
        description: 'Zumo de naranja exprimido al momento. Fresco y natural.',
        price: 3.00,
        allergens: [],
      },
      {
        id: 'dr5',
        name: 'Limonada casera',
        description: 'Limón, hierbabuena, azúcar de caña y menta. Muy refrescante.',
        price: 3.50,
        allergens: [],
      },
    ],
  },
]
