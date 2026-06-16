// =============================================================================
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// AVISO LEGAL — ALERGENOS INFERIDOS AUTOMATICAMENTE A PARTIR DE LA CARTA
//
// Los alergenos asignados a cada producto en este archivo han sido INFERIDOS
// de forma automatica a partir de los ingredientes descritos en la carta.
// NO HAN SIDO VALIDADOS NI VERIFICADOS POR UN ESPECIALISTA.
//
// El negocio DEBE revisar y completar estos alergenos ANTES DE PONER EN
// PRODUCCION la aplicacion. La declaracion de alergenos en la carta es un
// REQUISITO LEGAL OBLIGATORIO en la Union Europea (Reglamento UE 1169/2011,
// articulo 21, y normativa espanola de desarrollo). La omision o el error en
// la declaracion de alergenos puede suponer responsabilidad legal.
//
// Contactar con un tecnologo alimentario o especialista en seguridad
// alimentaria para la validacion definitiva.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// =============================================================================
//
// seedCatalog.js — Seed del catalogo completo de La Casa Nostra.
//
// Estrategia de idempotencia:
//   - Las categorias se crean/actualizan con upsert por `slug` (clave estable).
//   - Los productos NO tienen clave natural unica en el schema (solo id UUID).
//     Para evitar duplicados en cada re-ejecucion del seed, antes de insertar
//     los productos de una categoria se eliminan todos los que ya existian
//     en ella (borrado en cascada de ingredients, optionGroups/choices y
//     productAllergens). Esto es seguro en un seed de datos de catalogo, donde
//     no hay FK de negocio que apunten directamente al id del producto desde
//     orderLines (orderLines usa referencia blanda nullable).
//   - Los alergenos se crean/actualizan con upsert por `name`.
//
// Uso:
//   npm run prisma:seed:catalog
//
// Notas pendientes (NO implementadas — ver comentario al final del archivo):
//   - "Sin gluten +1,50 EUR" (algunas especialidades)
//   - "Pan gallego +0,50 EUR" (algunas especialidades)
//   - "Hamburguesa 200g +2,00 EUR" (upgrade de peso)
//   - "Americanos: cambiar salchicha por cervela 190g +1,00 EUR"
// =============================================================================

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// 14 ALERGENOS UE (Reglamento UE 1169/2011)
// ---------------------------------------------------------------------------
const ALLERGENS = [
  { name: 'gluten',             icon: '🌾' },
  { name: 'crustaceos',         icon: '🦐' },
  { name: 'huevos',             icon: '🥚' },
  { name: 'pescado',            icon: '🐟' },
  { name: 'cacahuetes',         icon: '🥜' },
  { name: 'soja',               icon: '🫘' },
  { name: 'lacteos',            icon: '🥛' },
  { name: 'frutos-de-cascara',  icon: '🌰' },
  { name: 'apio',               icon: '🌿' },
  { name: 'mostaza',            icon: '🟡' },
  { name: 'sesamo',             icon: '🌱' },
  { name: 'sulfitos',           icon: '🍷' },
  { name: 'altramuces',         icon: '🌼' },
  { name: 'moluscos',           icon: '🦑' },
]

// ---------------------------------------------------------------------------
// OPCIONES DE HAMBURGUESAS (compartidas entre todos los productos de la
// categoria burgers). Equivale a BURGER_OPTIONS en catalogMockData.js.
// ---------------------------------------------------------------------------
const BURGER_OPTION_GROUPS = [
  {
    label: 'Elige tu acompañante',
    type: 'single',
    sortOrder: 0,
    choices: [
      { label: 'Bravas',  priceDelta: 0, sortOrder: 0, available: true },
      { label: 'Fritas',  priceDelta: 0, sortOrder: 1, available: true },
      { label: 'Boniato', priceDelta: 0, sortOrder: 2, available: true },
    ],
  },
  {
    label: 'Elige tu salsa',
    type: 'single',
    sortOrder: 1,
    choices: [
      { label: 'Brava',           priceDelta: 0, sortOrder: 0, available: true },
      { label: 'Alioli',          priceDelta: 0, sortOrder: 1, available: true },
      { label: 'BBQ',             priceDelta: 0, sortOrder: 2, available: true },
      { label: 'César',           priceDelta: 0, sortOrder: 3, available: true },
      { label: 'Mostaza y miel',  priceDelta: 0, sortOrder: 4, available: true },
      { label: 'Sin salsa',       priceDelta: 0, sortOrder: 5, available: true },
    ],
  },
]

// ---------------------------------------------------------------------------
// DEFINICION DEL CATALOGO
//
// Cada entrada de producto puede tener:
//   allergens: string[]  — nombres de alergenos (deben existir en ALLERGENS)
//   ingredients: string[] — ingredientes removibles por el cliente
//   optionGroups: referencia a BURGER_OPTION_GROUPS u otros grupos
//
// Anotacion de alérgenos por regla general aplicada:
//   pan/rebozado           → gluten
//   queso/foie/nata        → lacteos
//   huevo/alioli/tartara   → huevos
//   alioli                 → huevos
//   salsa cesar            → huevos, lacteos, pescado (anchoas en cesar clasico)
//   anchoas                → pescado
//   calamares              → moluscos
//   nueces/anacardos       → frutos-de-cascara
//   pesto (con pinones)    → frutos-de-cascara
//   mostaza                → mostaza
//   hummus                 → sesamo (pasta de sesamo/tahini)
//   romesco                → frutos-de-cascara (almendras o avellanas en base romesco)
//   roquefort/queso azul   → lacteos
//   parmesano              → lacteos
// ---------------------------------------------------------------------------

const CATALOG = [
  // -------------------------------------------------------------------------
  {
    slug: 'classics',
    label: 'Clásicos',
    heading: '¡LOS CLÁSICOS QUE SÍ O SÍ NO PUEDEN FALTAR!',
    sortOrder: 0,
    products: [
      {
        name: 'Kiki',
        description: 'Pollo y salsa verde',
        price: '6.75',
        sortOrder: 0,
        allergens: ['gluten'],
        ingredients: ['Pollo', 'Salsa verde'],
      },
      {
        name: 'Kiriko',
        description: 'Pollo, bacon, queso',
        price: '7.95',
        sortOrder: 1,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Pollo', 'Bacon', 'Queso'],
      },
      {
        name: 'Kiki guay "colorao"',
        description: 'Pollo, pimiento rojo y salsa verde',
        price: '7.95',
        sortOrder: 2,
        allergens: ['gluten'],
        ingredients: ['Pollo', 'Pimiento rojo', 'Salsa verde'],
      },
      {
        name: 'Kiki guay "verde"',
        description: 'Pollo, pimiento verde y salsa verde',
        price: '7.95',
        sortOrder: 3,
        allergens: ['gluten'],
        ingredients: ['Pollo', 'Pimiento verde', 'Salsa verde'],
      },
      {
        name: 'Super kiki',
        description: 'Pollo rebozado y lechuga',
        price: '7.95',
        sortOrder: 4,
        allergens: ['gluten'],
        ingredients: ['Pollo rebozado', 'Lechuga'],
      },
      {
        name: 'Lomo',
        description: null,
        price: '6.75',
        sortOrder: 5,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Lomo con queso',
        description: null,
        price: '7.50',
        sortOrder: 6,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Queso'],
      },
      {
        name: 'Lomo La Casa Nostra',
        description: 'Lomo, queso, champiñones y orégano',
        price: '7.95',
        sortOrder: 7,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Lomo', 'Queso', 'Champiñones'],
      },
      {
        name: 'Pinchos',
        description: null,
        price: '7.50',
        sortOrder: 8,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Floren P.',
        description: 'Calamares y alioli',
        price: '7.50',
        sortOrder: 9,
        allergens: ['gluten', 'huevos', 'moluscos'],
        ingredients: ['Calamares', 'Alioli'],
      },
      {
        name: 'Frankfurt',
        description: null,
        price: '3.95',
        sortOrder: 10,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Cervela pequeña',
        description: null,
        price: '4.50',
        sortOrder: 11,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Cervela 190gr',
        description: null,
        price: '6.95',
        sortOrder: 12,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Bratwurst',
        description: null,
        price: '4.50',
        sortOrder: 13,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Pikantwurst',
        description: null,
        price: '4.50',
        sortOrder: 14,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Hamburguesa',
        description: null,
        price: '4.50',
        sortOrder: 15,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Malagueña',
        description: null,
        price: '4.50',
        sortOrder: 16,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Bacon',
        description: null,
        price: '6.50',
        sortOrder: 17,
        allergens: ['gluten'],
        ingredients: [],
      },
      {
        name: 'Bacon con queso',
        description: null,
        price: '6.95',
        sortOrder: 18,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Queso'],
      },
      {
        name: 'Bacon La Casa Nostra',
        description: 'Bacon, queso, cebolla La Casa Nostra y huevo frito',
        price: '7.95',
        sortOrder: 19,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: ['Bacon', 'Queso', 'Cebolla La Casa Nostra', 'Huevo frito'],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'tapas',
    label: 'Tapas',
    heading: 'TAPAS PARA COMPARTIR O COMER SOLO/A',
    sortOrder: 1,
    products: [
      {
        name: 'Fritas 1/2 ración',
        description: null,
        price: '3.95',
        sortOrder: 0,
        allergens: [],
        ingredients: [],
      },
      {
        name: 'Fritas',
        description: null,
        price: '5.50',
        sortOrder: 1,
        allergens: [],
        ingredients: [],
      },
      {
        name: 'Bravas 1/2 ración',
        description: null,
        price: '4.50',
        sortOrder: 2,
        // Salsa brava puede llevar mostaza segun receta; alioli lleva huevos.
        allergens: ['huevos'],
        ingredients: [],
      },
      {
        name: 'Bravas',
        description: null,
        price: '6.50',
        sortOrder: 3,
        allergens: ['huevos'],
        ingredients: [],
      },
      {
        name: 'Croquetas (8 uds.)',
        description: null,
        price: '7.95',
        sortOrder: 4,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: [],
      },
      {
        name: 'Tequeños (6 uds.)',
        description: null,
        price: '7.95',
        sortOrder: 5,
        // Tequeños = masa de harina rellena de queso
        allergens: ['gluten', 'lacteos'],
        ingredients: [],
      },
      {
        name: 'Fingers La Casa Nostra',
        description: null,
        price: '7.95',
        sortOrder: 6,
        // Fingers de pollo rebozados
        allergens: ['gluten', 'huevos'],
        ingredients: [],
      },
      {
        name: 'Guacamole La Casa Nostra',
        description: null,
        price: '7.95',
        sortOrder: 7,
        allergens: [],
        ingredients: [],
      },
      {
        name: 'Huevos rotos con jamón',
        description: null,
        price: '13.00',
        sortOrder: 8,
        allergens: ['huevos'],
        ingredients: [],
      },
      {
        name: 'Hummus La Casa Nostra',
        description: null,
        price: '7.95',
        sortOrder: 9,
        // Hummus lleva tahini (pasta de sesamo)
        allergens: ['sesamo'],
        ingredients: [],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'salads',
    label: 'Ensaladas',
    heading: 'ENSALADAS FRESCAS Y GENEROSAS',
    sortOrder: 2,
    products: [
      {
        name: 'La Albuquerque',
        description: 'Lechuga, tomate, aguacate, bacon, cebolla frita y mostaza dulce',
        price: '7.20',
        sortOrder: 0,
        allergens: ['mostaza'],
        ingredients: ['Lechuga', 'Tomate', 'Aguacate', 'Bacon', 'Cebolla frita', 'Mostaza dulce'],
      },
      {
        name: 'La Marbella',
        description: 'Lechuga, rúcula, escalivada, anchoas, olivada y alcaparras',
        price: '7.95',
        sortOrder: 1,
        allergens: ['pescado'],
        ingredients: ['Lechuga', 'Rúcula', 'Escalivada', 'Anchoas', 'Olivada', 'Alcaparras'],
      },
      {
        name: 'La New Jersey',
        description: 'Arroz, cherry, aguacate, rábano, manzana y salsa tártara',
        price: '7.20',
        sortOrder: 2,
        // Salsa tartara lleva mayonesa (huevos)
        allergens: ['huevos'],
        ingredients: ['Arroz', 'Cherry', 'Aguacate', 'Rábano', 'Manzana', 'Salsa tártara'],
      },
      {
        name: 'La Nápoles',
        description: 'Quinoa, rúcula, parmesano, tomates cherry con aceite de albahaca',
        price: '7.20',
        sortOrder: 3,
        allergens: ['lacteos'],
        ingredients: ['Quinoa', 'Rúcula', 'Parmesano', 'Tomates cherry', 'Aceite de albahaca'],
      },
      {
        name: 'La Roma',
        description: 'Lechuga, pollo, bacon, parmesano, huevo y salsa césar',
        price: '7.20',
        sortOrder: 4,
        // Salsa cesar clasica: anchoas, huevo, queso
        allergens: ['lacteos', 'huevos', 'pescado'],
        ingredients: ['Lechuga', 'Pollo', 'Bacon', 'Parmesano', 'Huevo', 'Salsa césar'],
      },
      {
        name: 'La Sicilia',
        description: 'Lechuga, espinaca y rúcula, cherry, manzana, anacardos y pesto rosso',
        price: '7.20',
        sortOrder: 5,
        // Anacardos = frutos de cascara; pesto rosso puede llevar pinones (frutos de cascara)
        allergens: ['frutos-de-cascara'],
        ingredients: ['Lechuga', 'Espinaca', 'Rúcula', 'Cherry', 'Manzana', 'Anacardos', 'Pesto rosso'],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'burgers',
    label: 'Hamburguesas',
    heading: 'NUESTRAS HAMBURGUESAS ARTESANAS',
    sortOrder: 3,
    products: [
      {
        name: 'Frank Costello',
        description: 'Hamburguesa, lechuga, tomate, pepinillo, bacon, queso, salsa tártara',
        price: '9.95',
        sortOrder: 0,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: ['Lechuga', 'Tomate', 'Pepinillo', 'Bacon', 'Queso', 'Salsa tártara'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
      {
        name: 'Sonny',
        description: 'Hamburguesa, foie, cebolla La Casa Nostra y mermelada de tomate',
        price: '9.95',
        sortOrder: 1,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Foie', 'Cebolla La Casa Nostra', 'Mermelada de tomate'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
      {
        name: 'Sr. Blanco',
        description: 'Hamburguesa, queso de cabra, trigueros, cebolla La Casa Nostra y salsa mostaza dulce',
        price: '10.95',
        sortOrder: 2,
        allergens: ['gluten', 'lacteos', 'mostaza'],
        ingredients: ['Queso de cabra', 'Trigueros', 'Cebolla La Casa Nostra', 'Salsa mostaza dulce'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
      {
        name: 'Frank Lucas',
        description: 'Hamburguesa, queso, champiñones, cebolla La Casa Nostra, rúcula y salsa romesco',
        price: '10.95',
        sortOrder: 3,
        // Romesco lleva almendras/avellanas
        allergens: ['gluten', 'lacteos', 'frutos-de-cascara'],
        ingredients: ['Queso', 'Champiñones', 'Cebolla La Casa Nostra', 'Rúcula', 'Salsa romesco'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
      {
        name: 'Tony Montana',
        description: 'Hamburguesa, lechuga, tomate, bacon, queso, cebolla crujiente, salsa BBQ',
        price: '9.95',
        sortOrder: 4,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Lechuga', 'Tomate', 'Bacon', 'Queso', 'Cebolla crujiente', 'Salsa BBQ'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
      {
        name: 'Frank Sinatra',
        description: 'Hamburguesa, lechuga, nueces y salsa roquefort',
        price: '9.95',
        sortOrder: 5,
        allergens: ['gluten', 'lacteos', 'frutos-de-cascara'],
        ingredients: ['Lechuga', 'Nueces', 'Salsa roquefort'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
      {
        name: 'Mickey Cohen',
        description: 'Hamburguesa, lechuga, tomate, pepinillo, bacon, queso, cebolla La Casa Nostra y huevo frito',
        price: '10.95',
        sortOrder: 6,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: ['Lechuga', 'Tomate', 'Pepinillo', 'Bacon', 'Queso', 'Cebolla La Casa Nostra', 'Huevo frito'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
      {
        name: 'Saul Goodman',
        description: 'Hamburguesa de pollo crujiente, bacon, queso y lechuga',
        price: '9.95',
        sortOrder: 7,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Bacon', 'Queso', 'Lechuga'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
      {
        name: 'Hamburguesa "La Casa Nostra"',
        description: 'Hamburguesa, hoja de espinaca, bacon, queso, salsa pesto rosso y anacardos',
        price: '9.95',
        sortOrder: 8,
        // Pesto rosso + anacardos = frutos de cascara
        allergens: ['gluten', 'lacteos', 'frutos-de-cascara'],
        ingredients: ['Hoja de espinaca', 'Bacon', 'Queso', 'Salsa pesto rosso', 'Anacardos'],
        optionGroups: BURGER_OPTION_GROUPS,
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'vegetarians',
    label: 'Vegetarianos',
    heading: 'OPCIONES VEGETARIANAS CON TODO EL SABOR',
    sortOrder: 4,
    products: [
      {
        name: 'Heisenberg',
        description: 'Escalivada, champiñones y olivada',
        price: '7.50',
        sortOrder: 0,
        allergens: ['gluten'],
        ingredients: ['Escalivada', 'Champiñones', 'Olivada'],
      },
      {
        name: 'Huerta Brava',
        description: 'Hamburguesa vegana, hoja de espinaca fresca, queso, alcachofa a la plancha y salsa romesco',
        price: '10.95',
        sortOrder: 1,
        allergens: ['gluten', 'lacteos', 'frutos-de-cascara'],
        ingredients: ['Hoja de espinaca fresca', 'Queso', 'Alcachofa a la plancha', 'Salsa romesco'],
      },
      {
        name: 'Dolce Vita',
        description: 'Hamburguesa vegana, queso, calabacín a la plancha, cebolla La Casa Nostra y pesto rosso',
        price: '9.95',
        sortOrder: 2,
        allergens: ['gluten', 'lacteos', 'frutos-de-cascara'],
        ingredients: ['Queso', 'Calabacín a la plancha', 'Cebolla La Casa Nostra', 'Pesto rosso'],
      },
      {
        name: 'Tony el gordo',
        description: 'Pisto, trigueros y queso de cabra',
        price: '7.95',
        sortOrder: 3,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Pisto', 'Trigueros', 'Queso de cabra'],
      },
      {
        name: 'Tony Soprano',
        description: 'Guacamole, cebolla La Casa Nostra, lechuga, tomate y huevo frito',
        price: '7.50',
        sortOrder: 4,
        allergens: ['gluten', 'huevos'],
        ingredients: ['Guacamole', 'Cebolla La Casa Nostra', 'Lechuga', 'Tomate', 'Huevo frito'],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'chicken',
    label: 'Pollos',
    heading: 'POLLO TIERNO Y CRUJIENTE COMO NINGÚN OTRO',
    sortOrder: 5,
    products: [
      {
        name: 'Al Capone',
        description: 'Pollo, queso, huevo frito y salsa verde',
        price: '7.95',
        sortOrder: 0,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: ['Pollo', 'Queso', 'Huevo frito', 'Salsa verde'],
      },
      {
        name: 'Billy el Carnicero',
        description: 'Pollo, cebolla La Casa Nostra, champiñones y romesco',
        price: '8.25',
        sortOrder: 1,
        allergens: ['gluten', 'frutos-de-cascara'],
        ingredients: ['Pollo', 'Cebolla La Casa Nostra', 'Champiñones', 'Romesco'],
      },
      {
        name: 'Jimmy Conway',
        description: 'Pollo, rúcula, tomate, parmesano y aceite de albahaca',
        price: '8.25',
        sortOrder: 2,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Pollo', 'Rúcula', 'Tomate', 'Parmesano', 'Aceite de albahaca'],
      },
      {
        name: 'Noodles Aaronson',
        description: 'Pollo, pisto y queso de cabra',
        price: '8.95',
        sortOrder: 3,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Pollo', 'Pisto', 'Queso de cabra'],
      },
      {
        name: 'Paul Vitti',
        description: 'Pollo, lechuga, tomate, huevo duro, alioli',
        price: '7.50',
        sortOrder: 4,
        allergens: ['gluten', 'huevos'],
        ingredients: ['Pollo', 'Lechuga', 'Tomate', 'Huevo duro', 'Alioli'],
      },
      {
        name: 'Sam "Ace" Rothstein',
        description: 'Pollo, salsa curry, manzana',
        price: '7.95',
        sortOrder: 5,
        allergens: ['gluten'],
        ingredients: ['Pollo', 'Salsa curry', 'Manzana'],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'sandwiches',
    label: 'Sándwiches',
    heading: 'SÁNDWICHES PARA TODOS LOS GUSTOS',
    sortOrder: 6,
    products: [
      {
        name: 'El Bikini de toda la vida',
        description: null,
        price: '3.95',
        sortOrder: 0,
        // Bikini clasico = jamon + queso en pan de molde
        allergens: ['gluten', 'lacteos'],
        ingredients: [],
      },
      {
        name: 'Carlo Gambino',
        description: 'Pollo rebozado, bacon, queso, lechuga y salsa tártara',
        price: '7.50',
        sortOrder: 1,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: ['Pollo rebozado', 'Bacon', 'Queso', 'Lechuga', 'Salsa tártara'],
      },
      {
        name: 'Joseph Bonanno',
        description: 'Jamón dulce, queso y huevo frito',
        price: '6.50',
        sortOrder: 2,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: ['Jamón dulce', 'Queso', 'Huevo frito'],
      },
      {
        name: 'Lucky Luciano',
        description: 'Pollo, espinaca fresca, queso, huevo frito y alioli',
        price: '7.50',
        sortOrder: 3,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: ['Pollo', 'Espinaca fresca', 'Queso', 'Huevo frito', 'Alioli'],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'american',
    label: 'Americanos',
    // Nota: la carta indica "se puede cambiar la salchicha" (por cervela 190g +1 EUR)
    // — no modelado como OptionGroup en esta iteracion (ver comentario al final)
    heading: 'EL ESTILO AMERICANO QUE NOS ENCANTA',
    sortOrder: 7,
    products: [
      {
        name: 'Christopher Moltisanti',
        description: 'Frankfurt, bacon, queso y huevo frito',
        price: '8.50',
        sortOrder: 0,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: ['Frankfurt', 'Bacon', 'Queso', 'Huevo frito'],
      },
      {
        name: 'Donnie Brasco',
        description: 'Frankfurt, pepinillo, cebolla crujiente, kétchup y mostaza dulce',
        price: '7.50',
        sortOrder: 1,
        allergens: ['gluten', 'mostaza'],
        ingredients: ['Frankfurt', 'Pepinillo', 'Cebolla crujiente', 'Kétchup', 'Mostaza dulce'],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'pork-loin',
    label: 'Solomillo de cerdo',
    heading: 'SOLOMILLO DE CERDO: TERNURA EN CADA BOCADO',
    sortOrder: 8,
    products: [
      {
        name: 'Don Vito',
        description: 'Solomillo de cerdo, pisto y trigueros',
        price: '8.95',
        sortOrder: 0,
        allergens: ['gluten'],
        ingredients: ['Solomillo de cerdo', 'Pisto', 'Trigueros'],
      },
      {
        name: 'Michael',
        description: 'Solomillo de cerdo, cebolla La Casa Nostra y reducción de oporto',
        price: '8.25',
        sortOrder: 1,
        // Reduccion de oporto lleva sulfitos
        allergens: ['gluten', 'sulfitos'],
        ingredients: ['Solomillo de cerdo', 'Cebolla La Casa Nostra', 'Reducción de oporto'],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'loins',
    label: 'Lomos',
    heading: 'LOMOS HECHOS CON EL MEJOR PRODUCTO',
    sortOrder: 9,
    products: [
      {
        name: 'Jules',
        description: 'Lomo, jamón serrano, pimiento verde y lechuga',
        price: '8.25',
        sortOrder: 0,
        allergens: ['gluten'],
        ingredients: ['Lomo', 'Jamón serrano', 'Pimiento verde', 'Lechuga'],
      },
      {
        name: 'Vincent Vega',
        description: 'Lomo, queso, rúcula y pesto rosso',
        price: '8.25',
        sortOrder: 1,
        allergens: ['gluten', 'lacteos', 'frutos-de-cascara'],
        ingredients: ['Lomo', 'Queso', 'Rúcula', 'Pesto rosso'],
      },
      {
        name: 'Marcellus Wallace',
        description: 'Lomo, bacon, queso, lechuga y tomate',
        price: '8.25',
        sortOrder: 2,
        allergens: ['gluten', 'lacteos'],
        ingredients: ['Lomo', 'Bacon', 'Queso', 'Lechuga', 'Tomate'],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'combos',
    label: 'Platos combinados',
    heading: 'PLATOS COMBINADOS QUE LO LLEVAN TODO',
    sortOrder: 10,
    products: [
      {
        name: 'Combinado 1',
        description: 'Patatas, huevo frito, pollo a la plancha y pimientos del padrón',
        price: '12.95',
        sortOrder: 0,
        allergens: ['huevos'],
        ingredients: [],
      },
      {
        name: 'Combinado 2',
        description: 'Patatas, huevo frito, hamburguesa de ternera y pimientos del padrón',
        price: '12.95',
        sortOrder: 1,
        allergens: ['gluten', 'huevos'],
        ingredients: [],
      },
      {
        name: 'Combinado 3',
        description: 'Patatas, huevo frito, lomo y pimientos del padrón',
        price: '12.95',
        sortOrder: 2,
        allergens: ['huevos'],
        ingredients: [],
      },
      {
        name: 'Combinado 4',
        description: 'Patatas, huevo frito, pollo rebozado y pimientos del padrón',
        price: '12.95',
        sortOrder: 3,
        allergens: ['gluten', 'huevos'],
        ingredients: [],
      },
      {
        name: 'Combinado 5',
        description: 'Patatas, huevo frito, calamares a la romana y pimientos del padrón',
        price: '12.95',
        sortOrder: 4,
        allergens: ['gluten', 'huevos', 'moluscos'],
        ingredients: [],
      },
      {
        name: 'Combinado 6',
        description: 'Patatas al caliu, solomillo al oporto, pisto y pimientos del padrón',
        price: '12.95',
        sortOrder: 5,
        allergens: ['sulfitos'],
        ingredients: [],
      },
      {
        name: 'Combinado 7',
        description: 'Patatas al caliu, hamburguesa vegana, pisto y pimientos del padrón',
        price: '12.95',
        sortOrder: 6,
        allergens: [],
        ingredients: [],
      },
      {
        name: 'Combinado 8',
        description: 'Patatas fritas, huevo frito, tequeños y pimientos del padrón',
        price: '12.95',
        sortOrder: 7,
        allergens: ['gluten', 'lacteos', 'huevos'],
        ingredients: [],
      },
      {
        name: 'Combinado 9',
        description: 'Patatas fritas, huevo frito, pinchos y pimientos del padrón',
        price: '12.95',
        sortOrder: 8,
        allergens: ['gluten', 'huevos'],
        ingredients: [],
      },
      {
        name: 'Combinado 10',
        description: 'Patatas al caliu, escalivada, calabacín, champiñones, pimientos del padrón y salsa romesco',
        price: '12.95',
        sortOrder: 9,
        allergens: ['frutos-de-cascara'],
        ingredients: [],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'desserts',
    label: 'Postres',
    heading: 'POSTRES PARA REDONDEAR LA COMIDA',
    sortOrder: 11,
    products: [
      {
        name: 'Coulant',
        description: null,
        price: '6.50',
        sortOrder: 0,
        // Coulant de chocolate: harina + huevos + mantequilla (gluten, huevos, lacteos)
        allergens: ['gluten', 'huevos', 'lacteos'],
        ingredients: [],
      },
      {
        name: 'Vasito de red velvet',
        description: null,
        price: '6.50',
        sortOrder: 1,
        allergens: ['gluten', 'huevos', 'lacteos'],
        ingredients: [],
      },
      {
        name: 'Cheese cake',
        description: null,
        price: '6.50',
        sortOrder: 2,
        allergens: ['gluten', 'huevos', 'lacteos'],
        ingredients: [],
      },
      {
        name: 'Vasito de brownie',
        description: null,
        price: '6.50',
        sortOrder: 3,
        allergens: ['gluten', 'huevos', 'lacteos'],
        ingredients: [],
      },
      {
        name: 'Vasito de carrot cake',
        description: null,
        price: '6.50',
        sortOrder: 4,
        allergens: ['gluten', 'huevos', 'lacteos'],
        ingredients: [],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Elimina en cascada todos los productos de una categoria y sus relaciones:
 * - product_allergens
 * - option_choices (a traves de option_groups)
 * - option_groups
 * - ingredients
 * Despues borra los productos.
 * Esto garantiza idempotencia al volver a ejecutar el seed.
 */
async function deleteProductsByCategory(categoryId) {
  // Obtener ids de productos de esta categoria
  const products = await prisma.product.findMany({
    where: { categoryId },
    select: { id: true },
  })
  if (products.length === 0) return

  const productIds = products.map((p) => p.id)

  // Eliminar relaciones N:M (ProductAllergen)
  await prisma.productAllergen.deleteMany({
    where: { productId: { in: productIds } },
  })

  // Obtener ids de option_groups
  const optionGroups = await prisma.optionGroup.findMany({
    where: { productId: { in: productIds } },
    select: { id: true },
  })
  if (optionGroups.length > 0) {
    const groupIds = optionGroups.map((g) => g.id)
    await prisma.optionChoice.deleteMany({
      where: { optionGroupId: { in: groupIds } },
    })
    await prisma.optionGroup.deleteMany({
      where: { id: { in: groupIds } },
    })
  }

  // Eliminar ingredients
  await prisma.ingredient.deleteMany({
    where: { productId: { in: productIds } },
  })

  // Eliminar productos
  // Nota: orderLines tiene referencia blanda (productId nullable) — Prisma
  // pondra product_id = NULL en las lineas existentes gracias a onDelete: SetNull
  // definido implicitamente por el nullable FK en el schema.
  await prisma.product.deleteMany({
    where: { id: { in: productIds } },
  })
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log('[seedCatalog] Starting catalog seed...')

  // 1. Upsert de los 14 alergenos UE
  console.log('[seedCatalog] Upserting allergens...')
  const allergenMap = {}
  for (const allergen of ALLERGENS) {
    const record = await prisma.allergen.upsert({
      where: { name: allergen.name },
      update: { icon: allergen.icon },
      create: { name: allergen.name, icon: allergen.icon },
    })
    allergenMap[allergen.name] = record.id
  }
  console.log(`[seedCatalog] ${ALLERGENS.length} allergens ready.`)

  // 2. Iterar categorias
  let totalProducts = 0

  for (const categoryDef of CATALOG) {
    const { slug, label, heading, sortOrder, products } = categoryDef

    // 2a. Upsert de la categoria
    const category = await prisma.category.upsert({
      where: { slug },
      update: { label, heading, sortOrder },
      create: { slug, label, heading, sortOrder },
    })
    console.log(`[seedCatalog] Category "${slug}" upserted (id: ${category.id})`)

    // 2b. Limpiar productos existentes de esta categoria (idempotencia)
    await deleteProductsByCategory(category.id)

    // 2c. Crear productos
    for (const productDef of products) {
      const {
        name,
        description,
        price,
        sortOrder: productSortOrder,
        allergens: allergenNames = [],
        ingredients: ingredientNames = [],
        optionGroups: optionGroupDefs = [],
      } = productDef

      // Crear el producto
      const product = await prisma.product.create({
        data: {
          categoryId: category.id,
          name,
          description,
          price,
          available: true,
          sortOrder: productSortOrder,
        },
      })

      // Crear alérgenos (ProductAllergen N:M)
      for (const allergenName of allergenNames) {
        const allergenId = allergenMap[allergenName]
        if (!allergenId) {
          console.warn(
            `[seedCatalog] WARNING: allergen "${allergenName}" not found for product "${name}". Skipping.`
          )
          continue
        }
        await prisma.productAllergen.create({
          data: { productId: product.id, allergenId },
        })
      }

      // Crear ingredientes removibles
      for (let i = 0; i < ingredientNames.length; i++) {
        await prisma.ingredient.create({
          data: {
            productId: product.id,
            name: ingredientNames[i],
            sortOrder: i,
          },
        })
      }

      // Crear grupos de opciones y sus choices
      for (const groupDef of optionGroupDefs) {
        const group = await prisma.optionGroup.create({
          data: {
            productId: product.id,
            label: groupDef.label,
            type: groupDef.type ?? 'single',
            sortOrder: groupDef.sortOrder ?? 0,
          },
        })
        for (const choiceDef of groupDef.choices) {
          await prisma.optionChoice.create({
            data: {
              optionGroupId: group.id,
              label: choiceDef.label,
              priceDelta: choiceDef.priceDelta ?? 0,
              sortOrder: choiceDef.sortOrder ?? 0,
              available: choiceDef.available ?? true,
            },
          })
        }
      }

      totalProducts++
    }

    console.log(
      `[seedCatalog] ${products.length} products seeded for category "${slug}".`
    )
  }

  console.log(
    `[seedCatalog] Done. ${CATALOG.length} categories, ${totalProducts} products seeded.`
  )

  console.log('')
  console.log('=========================================================')
  console.log('AVISO: Alergenos inferidos automaticamente — NO validados.')
  console.log('Revisar y completar ANTES de produccion (requisito legal).')
  console.log('=========================================================')
}

// ---------------------------------------------------------------------------
// Notas de opciones NO implementadas en esta iteracion:
//
// 1. "Sin gluten +1,50 EUR" — afecta a varias especialidades.
//    Modelar como OptionGroup { label: "Tipo de pan", type: "single" } con
//    OptionChoice { label: "Normal", priceDelta: 0 } y
//    OptionChoice { label: "Sin gluten", priceDelta: 1.50 }.
//    Requiere confirmar cuales de los productos lo ofrecen.
//
// 2. "Pan gallego +0,50 EUR" — afecta a algunos especiales.
//    Mismo patron: OptionGroup "Tipo de pan" con choice "Pan gallego".
//
// 3. "Hamburguesa 200g +2,00 EUR" — upgrade de peso en la categoria burgers.
//    Modelar como OptionGroup { label: "Tamaño", type: "single" } con
//    OptionChoice { label: "150g (estandar)", priceDelta: 0 } y
//    OptionChoice { label: "200g", priceDelta: 2.00 }.
//
// 4. "Americanos: cambiar salchicha por cervela 190g +1,00 EUR"
//    Modelar como OptionGroup { label: "Tipo de salchicha", type: "single" } con
//    OptionChoice { label: "Frankfurt (estandar)", priceDelta: 0 } y
//    OptionChoice { label: "Cervela 190g", priceDelta: 1.00 }.
//    Aplicar solo a los productos de la categoria "american".
// ---------------------------------------------------------------------------

main()
  .catch((e) => {
    console.error('[seedCatalog] Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
