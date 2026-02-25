const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verify() {
    console.log('🧪 Starting Sales Deduction Verification...')

    // 1. Setup Test Data
    const product = await prisma.product.findUnique({ where: { sku: 'B001' } })
    const location = await prisma.location.findUnique({ where: { code: 'WH_DRINKbar1' } })

    if (!product || !location) {
        console.error('❌ Data missing: B001 or WH_DRINKbar1 not found. Please run seed first.')
        return
    }

    console.log(`📍 Product: ${product.name} (${product.id})`)
    console.log(`📍 Location: ${location.name} (${location.id})`)

    // 2. Initial Inventory
    await prisma.inventory.upsert({
        where: { productId_locationId: { productId: product.id, locationId: location.id } },
        update: { quantity: 100 },
        create: { productId: product.id, locationId: location.id, quantity: 100, avgCost: 18000 }
    })

    const invBefore = await prisma.inventory.findUnique({
        where: { productId_locationId: { productId: product.id, locationId: location.id } }
    })
    console.log(`📦 Inventory BEFORE: ${invBefore.quantity}`)

    // 3. Setup Recipe
    let recipe = await prisma.recipe.findFirst({ where: { menuName: product.name } })
    if (!recipe) {
        recipe = await prisma.recipe.create({
            data: {
                menuName: product.name,
                isActive: true,
                bom: {
                    create: {
                        productId: product.id,
                        locationId: location.id,
                        quantity: 1, // 1 bottle per 1 sale
                        unit: 'ขวด'
                    }
                }
            }
        })
        console.log(`📝 Created Recipe for: ${product.name}`)
    } else {
        console.log(`📝 Existing Recipe found for: ${product.name}`)
    }

    // 4. Simulate Sale Import Deduction (Logic from route.ts)
    const saleQty = 5
    console.log(`🚀 Simulating sale of ${saleQty} items...`)

    const recipeWithBOM = await prisma.recipe.findFirst({
        where: { id: recipe.id },
        include: { bom: { include: { product: true } } }
    })

    await prisma.$transaction(async (tx) => {
        for (const bomItem of recipeWithBOM.bom) {
            const deductQty = bomItem.quantity * saleQty
            const inv = await tx.inventory.findUnique({
                where: { productId_locationId: { productId: bomItem.productId, locationId: bomItem.locationId } }
            })

            const newQty = Math.max(0, (inv?.quantity || 0) - deductQty)

            await tx.inventory.upsert({
                where: { productId_locationId: { productId: bomItem.productId, locationId: bomItem.locationId } },
                update: { quantity: newQty },
                create: {
                    productId: bomItem.productId,
                    locationId: bomItem.locationId,
                    quantity: newQty,
                    avgCost: bomItem.product.costPrice,
                }
            })

            await tx.stockMovement.create({
                data: {
                    productId: bomItem.productId,
                    fromLocationId: bomItem.locationId,
                    quantity: deductQty,
                    unitCost: bomItem.product.costPrice,
                    totalCost: deductQty * bomItem.product.costPrice,
                    type: 'SALE',
                    referenceType: 'VERIFICATION_TEST',
                    note: `Verification Test: ${product.name} x ${saleQty}`,
                }
            })
        }
    })

    // 5. Verify Results
    const invAfter = await prisma.inventory.findUnique({
        where: { productId_locationId: { productId: product.id, locationId: location.id } }
    })
    console.log(`📦 Inventory AFTER: ${invAfter.quantity}`)

    if (invAfter.quantity === invBefore.quantity - saleQty) {
        console.log('✅ SUCCESS: Inventory deducted correctly!')
    } else {
        console.log('❌ FAILURE: Inventory mismatch!')
    }
}

verify()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
