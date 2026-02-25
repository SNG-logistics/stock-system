/**
 * seed-bom-recipes.ts
 * สร้าง Recipe + BOM สำหรับ 14 เมนูจาก Deltafood "Good spit product"
 * รัน: npx tsx scripts/seed-bom-recipes.ts
 *
 * ⚠️  ตรวจสอบชื่อ raw material ใน column "rawName" ให้ตรงกับชื่อสินค้าในระบบก่อนรัน
 *     หรือระบบจะ skip BOM item ที่หาไม่เจอ (ไม่ crash)
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ─── Location defaults ──────────────────────────────────────
const LOC_BAR = 'WH_DRINKbar1'
const LOC_FRESH = 'WH_FRESH'
const LOC_KIT = 'KIT_STOCK'
const LOC_MAIN = 'WH_MAIN'
const LOC_FREEZE = 'FR_FREEZER'

/**
 * BOM Definition
 * qty  = จำนวนที่ใช้ต่อ 1 จาน/แก้ว/ขวด
 * unit = หน่วย (ชิ้น, ขวด, กก., ลิตร)
 * loc  = คลังที่ตัดสต็อค
 */
type BomLine = { rawName: string; qty: number; unit: string; loc: string }
type RecipeDef = { menuName: string; bom: BomLine[] }

const RECIPES: RecipeDef[] = [
    {
        menuName: 'Heineken (ขวดใหญ่)',
        bom: [
            { rawName: 'Heineken 630ml', qty: 1, unit: 'ขวด', loc: LOC_FREEZE },
        ],
    },
    {
        menuName: 'น้ำแข็ง ถังเล็ก',
        bom: [
            { rawName: 'น้ำแข็ง', qty: 2, unit: 'กก.', loc: LOC_MAIN },
        ],
    },
    {
        menuName: 'Beer Lao (ขวดใหญ่)',
        bom: [
            { rawName: 'Beer Lao 630ml', qty: 1, unit: 'ขวด', loc: LOC_FREEZE },
        ],
    },
    {
        menuName: 'น้ำดื่ม (ขวดใหญ่)',
        bom: [
            { rawName: 'น้ำดื่ม 1.5L', qty: 1, unit: 'ขวด', loc: LOC_BAR },
        ],
    },
    {
        menuName: 'น้ำแข็ง ถังใหญ่',
        bom: [
            { rawName: 'น้ำแข็ง', qty: 5, unit: 'กก.', loc: LOC_MAIN },
        ],
    },
    {
        menuName: 'น้ำดื่ม ตุกกลาง',
        bom: [
            { rawName: 'น้ำดื่ม 600ml', qty: 1, unit: 'ขวด', loc: LOC_BAR },
        ],
    },
    {
        menuName: 'ข้าวเหนียว 1 กล่อง',
        bom: [
            { rawName: 'ข้าวเหนียว', qty: 0.2, unit: 'กก.', loc: LOC_KIT },
        ],
    },
    {
        menuName: 'ข้าวผัด จานเล็ก',
        bom: [
            { rawName: 'ข้าวสวย', qty: 0.15, unit: 'กก.', loc: LOC_KIT },
            { rawName: 'ไข่ไก่', qty: 1, unit: 'ฟอง', loc: LOC_FRESH },
            { rawName: 'น้ำมันพืช', qty: 0.01, unit: 'ลิตร', loc: LOC_KIT },
            { rawName: 'ซีอิ้วขาว', qty: 0.005, unit: 'ลิตร', loc: LOC_KIT },
        ],
    },
    {
        menuName: 'ข้าวพนักงาน',
        bom: [
            { rawName: 'ข้าวสวย', qty: 0.2, unit: 'กก.', loc: LOC_KIT },
        ],
    },
    {
        menuName: 'Pepsi (ขวดพลาสติก)',
        bom: [
            { rawName: 'Pepsi 325ml', qty: 1, unit: 'ขวด', loc: LOC_BAR },
        ],
    },
    {
        menuName: 'เอ็นเหลืองทอด',
        bom: [
            { rawName: 'เอ็นเหลือง', qty: 0.1, unit: 'กก.', loc: LOC_FRESH },
            { rawName: 'น้ำมันพืช', qty: 0.02, unit: 'ลิตร', loc: LOC_KIT },
        ],
    },
    {
        menuName: 'เบียร์ไฮเนเก้น',
        bom: [
            // กระป๋อง 330ml (เล็งจากราคาต่อหน่วย ถูกกว่าขวดใหญ่)
            { rawName: 'Heineken 330ml', qty: 1, unit: 'กระป๋อง', loc: LOC_FREEZE },
        ],
    },
    {
        menuName: 'ซาบะรมควัน',
        bom: [
            { rawName: 'ปลาซาบะรมควัน', qty: 1, unit: 'ชิ้น', loc: LOC_FRESH },
        ],
    },
    {
        menuName: 'ข้าวผัด จานใหญ่',
        bom: [
            { rawName: 'ข้าวสวย', qty: 0.25, unit: 'กก.', loc: LOC_KIT },
            { rawName: 'ไข่ไก่', qty: 2, unit: 'ฟอง', loc: LOC_FRESH },
            { rawName: 'น้ำมันพืช', qty: 0.015, unit: 'ลิตร', loc: LOC_KIT },
            { rawName: 'ซีอิ้วขาว', qty: 0.008, unit: 'ลิตร', loc: LOC_KIT },
        ],
    },
]

async function main() {
    console.log('🍽️  เริ่มสร้าง Recipe + BOM...\n')

    for (const def of RECIPES) {
        console.log(`\n📋 ${def.menuName}`)

        // Find-or-create Recipe (menuName is not @unique, so can't use upsert)
        let recipe = await prisma.recipe.findFirst({ where: { menuName: def.menuName } })
        if (recipe) {
            recipe = await prisma.recipe.update({ where: { id: recipe.id }, data: { isActive: true } })
        } else {
            recipe = await prisma.recipe.create({
                data: {
                    menuName: def.menuName,
                    isActive: true,
                    note: 'Auto-seeded from Deltafood sales data',
                },
            })
        }

        // ลบ BOM เดิมถ้ามี (เพื่อ re-seed ใหม่)
        await prisma.recipeBOM.deleteMany({ where: { recipeId: recipe.id } })

        // สร้าง BOM items
        for (const line of def.bom) {
            // หา product ที่ชื่อตรง (หรือ contains) rawName
            const product = await prisma.product.findFirst({
                where: { isActive: true, name: { contains: line.rawName } },
            })

            if (!product) {
                console.log(`  ⚠️  ไม่พบสินค้า: "${line.rawName}" — ข้าม (เพิ่มสินค้าก่อนแล้วรัน script นี้ใหม่)`)
                continue
            }

            const location = await prisma.location.findUnique({ where: { code: line.loc } })
            if (!location) {
                console.log(`  ⚠️  ไม่พบคลัง: ${line.loc}`)
                continue
            }

            await prisma.recipeBOM.create({
                data: {
                    recipeId: recipe.id,
                    productId: product.id,
                    locationId: location.id,
                    quantity: line.qty,
                    unit: line.unit,
                },
            })
            console.log(`  ✅ BOM: ${product.name} × ${line.qty} ${line.unit} ← ${line.loc}`)
        }
    }

    console.log('\n🎉 เสร็จแล้ว!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
