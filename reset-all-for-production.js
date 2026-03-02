/**
 * reset-all-for-production.js
 * ล้างข้อมูลทั้งหมดเพื่อเริ่มต้นจริง (PRODUCTION RESET)
 *
 * ลบ:  ทุก transaction, inventory, recipes, products, sales, orders
 * คง:  users, categories, locations, suppliers, dining_tables
 *
 * Usage: node reset-all-for-production.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ log: ['warn', 'error'] })

async function main() {
    console.log('=====================================')
    console.log('  🔴  PRODUCTION FULL RESET STARTED  ')
    console.log('=====================================\n')

    const steps = [
        // --- Sales & Orders (ต้องก่อน FK) ---
        { name: 'sales_events', fn: () => prisma.salesEvent.deleteMany() },
        { name: 'order_items', fn: () => prisma.orderItem.deleteMany() },
        { name: 'payments', fn: () => prisma.payment.deleteMany() },
        { name: 'orders', fn: () => prisma.order.deleteMany() },

        // --- Sales imports ---
        { name: 'sales_import_items', fn: () => prisma.salesImportItem.deleteMany() },
        { name: 'sales_imports', fn: () => prisma.salesImport.deleteMany() },

        // --- Stock adjustments ---
        { name: 'adjustment_items', fn: () => prisma.adjustmentItem.deleteMany() },
        { name: 'stock_adjustments', fn: () => prisma.stockAdjustment.deleteMany() },

        // --- Transfers ---
        { name: 'transfer_items', fn: () => prisma.transferItem.deleteMany() },
        { name: 'stock_transfers', fn: () => prisma.stockTransfer.deleteMany() },

        // --- Purchase ---
        { name: 'purchase_items', fn: () => prisma.purchaseItem.deleteMany() },
        { name: 'purchase_orders', fn: () => prisma.purchaseOrder.deleteMany() },

        // --- Stock movements & inventory ---
        { name: 'stock_movements', fn: () => prisma.stockMovement.deleteMany() },
        { name: 'inventory', fn: () => prisma.inventory.deleteMany() },

        // --- Recipes (BOM ก่อน Recipe) ---
        { name: 'recipe_bom', fn: () => prisma.recipeBOM.deleteMany() },
        { name: 'recipes', fn: () => prisma.recipe.deleteMany() },

        // --- Products ---
        { name: 'products', fn: () => prisma.product.deleteMany() },

        // --- Reset dining table status ---
        { name: 'dining_tables (reset)', fn: () => prisma.diningTable.updateMany({ data: { status: 'AVAILABLE' } }) },
    ]

    let successCount = 0
    let skipCount = 0

    for (const step of steps) {
        try {
            const result = await step.fn()
            const count = result && 'count' in result ? result.count : '—'
            console.log(`  ✅  ${step.name.padEnd(28)}  rows: ${count}`)
            successCount++
        } catch (e) {
            console.log(`  ⚠️   ${step.name.padEnd(28)}  ข้ามไป → ${e.message.split('\n')[0]}`)
            skipCount++
        }
    }

    console.log('\n=====================================')
    console.log(`  ✅  รีเซ็ทเสร็จแล้ว!  (${successCount} สำเร็จ, ${skipCount} ข้าม)`)
    console.log('=====================================')
    console.log('  ยังคงอยู่:')
    console.log('    ✔ users (บัญชีผู้ใช้ทั้งหมด)')
    console.log('    ✔ categories (หมวดหมู่)')
    console.log('    ✔ locations (คลัง / สถานที่)')
    console.log('    ✔ suppliers (ซัพพลายเออร์)')
    console.log('    ✔ dining_tables (โต๊ะ — status reset → AVAILABLE)')
    console.log('  ถูกลบ:')
    console.log('    ✘ products, recipes, inventory')
    console.log('    ✘ ประวัติการซื้อ, ยอดขาย, การโอน, การปรับสต็อก')
    console.log('=====================================\n')
}

main()
    .catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
